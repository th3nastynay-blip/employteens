/**
 * EMPLOYTEENS — Shared Ingestion Pipeline
 *
 * Every ingestion source (Adzuna, JSearch, Greenhouse, Lever, Ashby, SmartRecruiters)
 * normalizes its raw response into the one NormalizedJob shape below, then hands it
 * to ingestNormalizedJobs(), which:
 *   1. Rejects generic/malformed URLs before any network call
 *   2. Verifies the URL (lib/jobs/verify-url.ts) — HTTP 200, specific posting,
 *      not closed/expired, and (for aggregator sources) content plausibly matches
 *      the title/location we were told the posting has
 *   3. Dedupes against existing rows by apply_url
 *   4. Inserts new rows / refreshes existing rows' verification metadata
 *   5. Writes a durable ingestion_logs row so numbers survive past a single run —
 *      this is what /api/admin/stats sums for the Phase 6 report
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { verifyJobUrl, isGenericCareerPage, type VerificationResult } from './verify-url'
import { getCompanyProfile, scoreTeenFriendliness, detectScamRisk, teenTitleVerdict, MAX_TEEN_AGE } from './teen-scoring'
import { resolveAllAgeFacts } from './child-labor'
import { cleanJobTitle } from './clean-title'
import { computeQualityScore, qualityTag, MIN_QUALITY_SCORE } from './quality-score'
import { zipFromLocation, isInMarket } from './geo'

export interface NormalizedJob {
  title: string
  company: string
  location: string
  state?: string
  zip_code?: string
  apply_url: string
  description?: string
  min_age?: number
  posted_at?: string
  salary_min?: number
  salary_max?: number
  job_type?: string
  /**
   * Set true for aggregator sources (Adzuna, JSearch) whose apply_url points at a
   * third-party page we don't control. Direct-ATS sources (Greenhouse/Lever/Ashby/
   * SmartRecruiters) should leave this false/undefined — their title & location
   * already came from that same ATS's structured API, so it's the source of truth
   * and doesn't need a second content-level check.
   */
  isAggregator?: boolean
  /**
   * Set true for curated local-source entries (municipal youth programs, rec
   * departments, library programs). Their URLs are program pages hand-verified
   * at curation time — verification still checks HTTP liveness and closed-
   * application language but skips the ATS job-ID URL pattern requirement.
   * See VerifyOptions.programPage in verify-url.ts.
   */
  isProgramPage?: boolean
  /** Pre-set user-facing tags (curated sources); merged with tags extracted from the title */
  tags?: string[]
  /**
   * Small businesses that hire by call, text, or email instead of an online
   * application — see lib/jobs/smb-phone-sources.ts. There's no URL to
   * fetch, so verifyJobUrl is never called for these; legitimacy instead
   * rests on a HUMAN having confirmed the listing (humanVerifiedAt/By
   * below), REGARDLESS of which of the three the teen ends up using —
   * texting instead of calling doesn't skip the "someone made real contact
   * and confirmed this is a real, currently-hiring, age-appropriate role"
   * step, it only changes what the teen does once that's already true.
   * humanVerifiedAt/By/ReverifyBy are REQUIRED when this is set — missing
   * any one rejects the entry rather than silently treating it as trusted.
   * contactPhone is required for 'call'/'text'; contactEmail for 'email'.
   * apply_url should still be set to a synthetic `tel:`/`sms:`/`mailto:`
   * string matching contactMethod (satisfies the NOT NULL column and
   * doubles as the actual tap-to-contact link in the UI).
   */
  contactMethod?: 'call' | 'text' | 'email'
  contactPhone?: string
  contactEmail?: string
  contactNote?: string
  humanVerifiedAt?: string
  humanVerifiedBy?: string
  /** Past this date the entry is treated as stale and rejected/deactivated until re-verified */
  humanReverifyBy?: string
}

export interface IngestStats {
  source: string
  fetched: number
  verified: number
  rejected_generic: number
  rejected_url: number
  rejected_mismatch: number
  rejected_scam: number
  rejected_no_apply: number
  rejected_account_wall: number
  rejected_aggregator: number
  rejected_low_quality: number
  rejected_not_teen_job: number
  /** Outside commute range of Hudson County. See the geo gate below. */
  rejected_out_of_market: number
  /** Phone-contact entry missing a required human-verification field — never auto-trusted */
  rejected_unverified_contact: number
  /** Phone-contact entry whose humanReverifyBy date has passed — needs a fresh call */
  rejected_stale_contact: number
  inserted: number
  updated: number
  duplicate: number
  /** First few rejection/insert-failure details — enough to diagnose a bad run from the response alone */
  rejections?: { url: string; status: string; reason: string }[]
  insert_errors?: string[]
}

const MAX_DIAGNOSTICS = 10

const SCAM_THRESHOLD = 70

// Defense in depth, not the primary fix (that's per-source, e.g. the
// job_salary_period check in app/api/ingest/jsearch/route.ts). This is the
// LAST line of defense before a number reaches the jobs table — the job
// card always renders salary as "$N/hr" with no unit label, so any future
// source (or a hand-typed local-sources.ts entry) that passes through an
// annual/monthly figure by mistake would otherwise ship "$45000/hr" to a
// real teen's screen with nothing in the pipeline to catch it. No legitimate
// hourly teen wage is anywhere near this ceiling.
const MAX_PLAUSIBLE_HOURLY_WAGE = 100

function sanitizeHourlyWage(amount: number | null | undefined): number | undefined {
  if (amount == null) return undefined
  const rounded = Math.round(amount)
  if (rounded <= 0 || rounded > MAX_PLAUSIBLE_HOURLY_WAGE) return undefined
  return rounded
}

function inferState(location: string, fallback?: string): string {
  const loc = location.toLowerCase()
  if (loc.includes('new jersey') || /\bnj\b/.test(loc)) return 'NJ'
  if (loc.includes('new york') || /\bny\b/.test(loc)) return 'NY'
  return fallback ?? 'NY'
}

export interface IngestOptions {
  /**
   * Skip the Pass-0 known-URL shortcut and verify EVERY job, every run.
   * REQUIRED for the curated local directory: its daily ingest was bumping
   * last_checked_at via Pass-0 without verifying, which pushed directory
   * rows to the back of clean-jobs' oldest-first recheck queue forever — a
   * 404'd AMC posting stayed live for days. API sources keep Pass-0 (their
   * feed re-offering a URL is itself a liveness signal; a static config
   * file re-offering one is not).
   */
  alwaysVerify?: boolean
}

export async function ingestNormalizedJobs(
  supabase: SupabaseClient<Database>,
  source: string,
  rawJobs: NormalizedJob[],
  options?: IngestOptions,
): Promise<IngestStats> {
  const runStartedAt = new Date().toISOString()
  const stats: IngestStats = {
    source,
    fetched: rawJobs.length,
    verified: 0,
    rejected_generic: 0,
    rejected_url: 0,
    rejected_mismatch: 0,
    rejected_scam: 0,
    rejected_no_apply: 0,
    rejected_account_wall: 0,
    rejected_aggregator: 0,
    rejected_low_quality: 0,
    rejected_not_teen_job: 0,
    rejected_out_of_market: 0,
    rejected_unverified_contact: 0,
    rejected_stale_contact: 0,
    inserted: 0,
    updated: 0,
    duplicate: 0,
    rejections: [],
    insert_errors: [],
  }

  function noteRejection(url: string, status: string, reason: string) {
    if ((stats.rejections?.length ?? 0) < MAX_DIAGNOSTICS) {
      stats.rejections?.push({ url, status, reason })
    }
  }

  // Dedup within this batch before any network call
  const seen = new Set<string>()
  const unique = rawJobs.filter((j) => {
    if (!j.apply_url || seen.has(j.apply_url)) return false
    seen.add(j.apply_url)
    return true
  })

  // Pass 0: skip verification for URLs we ALREADY have rows for. Re-verifying
  // known jobs on every daily ingest run burned most of the 60s budget on
  // network fetches for jobs clean-jobs re-checks on its own cadence anyway —
  // and that waste grows linearly with DB size, which is exactly the wrong
  // scaling direction. Known URLs go straight to the update path.
  // LIMITATION: this matches on the RAW url; Adzuna redirect links
  // (adzuna.com/land/ad/...) are stored under their post-redirect final_url,
  // so Adzuna jobs still re-verify daily until we persist a source_url column.
  const knownIds: string[] = []
  const knownUrls = new Set<string>()
  const CHUNK = 200
  const uniqueUrls = options?.alwaysVerify ? [] : unique.map((j) => j.apply_url)
  for (let i = 0; i < uniqueUrls.length; i += CHUNK) {
    // Only ACTIVE rows are skippable. An inactive known URL falls through to
    // verification — if it passes, the update path below resurrects it
    // legitimately. Skipping inactive rows here would resurrect dead jobs
    // without any check.
    const { data: knownRows } = await supabase
      .from('jobs')
      .select('id, apply_url')
      .eq('status', 'active')
      .in('apply_url', uniqueUrls.slice(i, i + CHUNK))
    for (const r of knownRows ?? []) {
      knownIds.push(r.id)
      knownUrls.add(r.apply_url)
    }
  }
  const toVerify = unique.filter((j) => !knownUrls.has(j.apply_url))

  // Pass 1: cheap in-memory checks + URL verification. Verification doesn't
  // touch our own database, but for aggregator sources (Adzuna/JSearch) it
  // DOES mean a real network fetch of the destination page per job — direct-
  // ATS sources skip that (see verify-url.ts Step 2). Run with limited
  // concurrency instead of one-at-a-time: a source that returns 100+ raw
  // results (Adzuna alone can) would otherwise blow past the 60s function
  // limit doing sequential fetches, exactly what happened in production
  // before this was parallelized.
  const VERIFY_CONCURRENCY = 8
  const verifiedJobs: { raw: NormalizedJob; finalUrl: string; httpStatus: number | null }[] = []
  // alwaysVerify mode: URLs that FAIL verification must also deactivate any
  // existing live row (the whole point is catching directory entries whose
  // pages died — rejection without deactivation would leave them live).
  const failedUrls: string[] = []
  const queue = [...toVerify]

  async function verifyWorker() {
    while (queue.length > 0) {
      const raw = queue.shift()
      if (!raw) break

      if (!raw.apply_url || !raw.title || !raw.company) {
        stats.rejected_generic++
        continue
      }

      if (isGenericCareerPage(raw.apply_url)) {
        stats.rejected_generic++
        continue
      }

      // A teenager can't be your VP of Product. Cheap check, runs before
      // any network call. Curated entries skip it (hand-picked).
      //
      // At INGEST, unlike the audit, an unrecognised title is rejected rather
      // than tagged. The asymmetry is deliberate: rejecting a new row costs us
      // one listing we never had, whereas flagging an existing row takes away
      // something a teen may already have saved. Cheap to be strict at the
      // door, expensive to be strict after the fact.
      if (!raw.isProgramPage) {
        const verdict = teenTitleVerdict(raw.title)
        if (verdict !== 'allow') {
          stats.rejected_not_teen_job++
          noteRejection(
            raw.apply_url,
            'not_teen_job',
            verdict === 'block'
              ? `Adult role title: ${raw.title.slice(0, 60)}`
              : `Unrecognised role title: ${raw.title.slice(0, 60)}`,
          )
          continue
        }
      }

      // GEO GATE — cheap, runs before any network call.
      //
      // This check existed in lib/jobs/geo.ts and was wired into the trust
      // audit but NEVER into ingest, so ATS and Workday sources dumped their
      // full national requisition lists straight into the table. Measured
      // 2026-08-10: 337 of 675 active listings (50%) were unreachable for any
      // Hudson County teen, including Buffalo, Bridgehampton, Cherry Hill and
      // one in Rochester Hills, Michigan.
      //
      // Program pages are exempt: curated municipal entries sometimes carry a
      // program name rather than a parseable address.
      if (!raw.isProgramPage && !isInMarket(raw.location)) {
        stats.rejected_out_of_market++
        noteRejection(raw.apply_url, 'out_of_market', `Out of commute range: ${String(raw.location).slice(0, 60)}`)
        continue
      }

      // Age gate, BEFORE any network call. The title check above only reads
      // the title; this reads the description, which is where employers
      // actually state "must be 18 years of age or older". Anything resolving
      // above 19 can never be shown to any user on this platform, so ingesting
      // it only costs verification budget and pollutes the age distribution.
      if (!raw.isProgramPage) {
        const age = resolveAllAgeFacts({
          title: raw.title,
          company: raw.company,
          description: raw.description,
          location: raw.location,
          declaredMinAge: raw.min_age,
        })
        if (age.effective_min_age > MAX_TEEN_AGE) {
          stats.rejected_not_teen_job++
          noteRejection(raw.apply_url, 'not_teen_job', `Age ${age.effective_min_age}+ — ${age.reasons.join('; ')}`)
          continue
        }
      }

      const scamScore = detectScamRisk({
        title: raw.title,
        company: raw.company,
        description: raw.description,
        apply_url: raw.apply_url,
      })

      if (scamScore >= SCAM_THRESHOLD) {
        stats.rejected_scam++
        continue
      }

      let verification: VerificationResult

      if (raw.contactMethod) {
        // No URL to fetch — legitimacy rests entirely on a human having made
        // real contact and confirmed this listing, regardless of which
        // channel the TEEN eventually uses. Missing any required field means
        // it was never verified (or was seeded as a candidate only, see
        // smb-phone-sources.ts) and must not slip through as trusted.
        const needsPhone = raw.contactMethod === 'call' || raw.contactMethod === 'text'
        const channelFieldMissing = needsPhone ? !raw.contactPhone : !raw.contactEmail
        if (channelFieldMissing || !raw.humanVerifiedAt || !raw.humanVerifiedBy || !raw.humanReverifyBy) {
          stats.rejected_unverified_contact++
          noteRejection(raw.apply_url, 'unverified_contact', `${raw.contactMethod}-contact entry missing a required human-verification field — not auto-trusted`)
          if (options?.alwaysVerify) failedUrls.push(raw.apply_url)
          continue
        }
        if (new Date(raw.humanReverifyBy).getTime() < Date.now()) {
          stats.rejected_stale_contact++
          noteRejection(raw.apply_url, 'stale_contact', `Human verification expired ${raw.humanReverifyBy} — needs a fresh check-in before this can go live again`)
          if (options?.alwaysVerify) failedUrls.push(raw.apply_url)
          continue
        }
        verification = {
          status: 'verified',
          http_status: null,
          is_active: true,
          reason: `Human-verified (${raw.contactMethod}, ${raw.humanVerifiedBy}, ${raw.humanVerifiedAt})`,
        }
      } else {
        verification = await verifyJobUrl(
          raw.apply_url,
          7000,
          // Company always included → default-deny destination check applies
          // to every fetched page; title/location content-matching applies to
          // aggregator-sourced links whose metadata we don't control.
          raw.isProgramPage
            ? undefined
            : raw.isAggregator
              ? { title: raw.title, location: raw.location, company: raw.company }
              : { company: raw.company },
          raw.isProgramPage ? { programPage: true } : undefined,
        )
      }

      if (verification.status === 'mismatch') {
        stats.rejected_mismatch++
        noteRejection(raw.apply_url, verification.status, verification.reason)
        continue
      }

      if (verification.status === 'no_apply_mechanism') {
        stats.rejected_no_apply++
        noteRejection(raw.apply_url, verification.status, verification.reason)
        continue
      }

      if (verification.status === 'account_wall') {
        stats.rejected_account_wall++
        noteRejection(raw.apply_url, verification.status, verification.reason)
        continue
      }

      if (verification.status === 'aggregator') {
        stats.rejected_aggregator++
        noteRejection(raw.apply_url, verification.status, verification.reason)
        continue
      }

      if (!verification.is_active) {
        stats.rejected_url++
        noteRejection(raw.apply_url, verification.status, `HTTP ${verification.http_status ?? '—'}: ${verification.reason}`)
        if (options?.alwaysVerify) failedUrls.push(raw.apply_url)
        continue
      }

      stats.verified++
      verifiedJobs.push({
        raw,
        finalUrl: verification.final_url ?? raw.apply_url,
        httpStatus: verification.http_status,
      })
    }
  }

  await Promise.all(Array.from({ length: VERIFY_CONCURRENCY }, verifyWorker))

  // Pass 2: ONE batched lookup instead of one SELECT per job — this was the
  // actual bottleneck once real sources started returning real volume (a
  // national chain's job board can easily return 50+ matches; at one DB
  // round-trip per job that blew past the 60s function limit with zero bytes
  // ever sent back to the client).
  const now = new Date().toISOString()

  if (verifiedJobs.length > 0 || knownIds.length > 0) {
    const { data: existingRows } = verifiedJobs.length > 0
      ? await supabase
          .from('jobs')
          .select('id, apply_url')
          .in('apply_url', verifiedJobs.map((v) => v.finalUrl))
      : { data: [] }

    const existingByUrl = new Map((existingRows ?? []).map((r) => [r.apply_url, r.id]))

    const toUpdateIds: string[] = []
    // Human-contact rows (call/text/email) can't share the batched update
    // below — each one's verified_at must reflect ITS OWN human_verified_at
    // (the actual verification date), not "now" (this cron run). Low volume
    // by nature, so per-row is fine.
    const toUpdateHumanContact: { id: string; raw: NormalizedJob }[] = []
    const toInsert: Record<string, unknown>[] = []

    for (const v of verifiedJobs) {
      const existingId = existingByUrl.get(v.finalUrl)
      if (existingId) {
        if (v.raw.contactMethod) {
          toUpdateHumanContact.push({ id: existingId, raw: v.raw })
        } else {
          toUpdateIds.push(existingId)
        }
        continue
      }

      const profile = getCompanyProfile(v.raw.company)
      const teenScore = scoreTeenFriendliness({
        title: v.raw.title,
        company: v.raw.company,
        description: v.raw.description,
      })
      const scamScore = detectScamRisk({
        title: v.raw.title,
        company: v.raw.company,
        description: v.raw.description,
        apply_url: v.raw.apply_url,
      })

      // Product-quality title: clean role name only; everything informative
      // from the raw title becomes structured tags.
      const cleaned = cleanJobTitle(v.raw.title)

      // Quality gate — below threshold never enters the table
      const quality = computeQualityScore({
        apply_url: v.finalUrl,
        company: v.raw.company,
        title_confidence: cleaned.confidence,
        scam_risk_score: scamScore,
        salary_min: v.raw.salary_min,
        description: v.raw.description,
        posted_at: v.raw.posted_at,
        is_curated: v.raw.isProgramPage,
      })
      if (quality.score < MIN_QUALITY_SCORE) {
        stats.rejected_low_quality++
        noteRejection(v.finalUrl, 'low_quality', `Quality ${quality.score} < ${MIN_QUALITY_SCORE} (${quality.signals.join(', ')})`)
        continue
      }

      // Age facts. Curated program pages are hand-verified, so their declared
      // age is trusted outright (their descriptions are rec-department
      // marketing copy, not requirements lists).
      const ageFacts = resolveAllAgeFacts({
        title: v.raw.title,
        company: v.raw.company,
        description: v.raw.description,
        location: v.raw.location,
        declaredMinAge: v.raw.min_age,
        trusted: v.raw.isProgramPage,
      })

      const tags = Array.from(new Set([
        ...(v.raw.tags ?? []),
        ...cleaned.tags,
        qualityTag(quality.score),
      ]))

      const isHumanContact = !!v.raw.contactMethod

      toInsert.push({
        title: cleaned.title,
        tags,
        company: v.raw.company,
        location: v.raw.location,
        state: inferState(v.raw.location, v.raw.state),
        // '00000' poisoned distance scoring — derive a city-central ZIP from
        // the location string so the match engine can compute honest miles.
        zip_code: v.raw.zip_code ?? zipFromLocation(v.raw.location) ?? '00000',
        apply_url: v.finalUrl,
        apply_method: v.raw.contactMethod ?? 'url',
        contact_phone: isHumanContact ? (v.raw.contactPhone ?? null) : null,
        contact_email: isHumanContact ? (v.raw.contactEmail ?? null) : null,
        contact_note: isHumanContact ? (v.raw.contactNote ?? null) : null,
        human_verified_at: isHumanContact ? v.raw.humanVerifiedAt : null,
        human_verified_by: isHumanContact ? v.raw.humanVerifiedBy : null,
        human_reverify_by: isHumanContact ? v.raw.humanReverifyBy : null,
        source,
        // Curated program pages carry a hand-verified age, so their declared
        // value is trusted outright (the description is marketing copy written
        // by a rec department, not a requirements list). Everything else goes
        // through full resolution: the employer's stated age in the posting
        // wins, then the declared/source value, then our heuristics, then a
        // hard legal floor. Passing the description is the whole point — it is
        // where "must be 18 years of age" actually lives.
        // Everything else resolves three separate facts and keeps them apart:
        // what the LAW permits for the occupation, what the EMPLOYER states,
        // and the effective age we filter on (the higher of the two, plus any
        // age implied by advertised hours). See lib/jobs/child-labor.ts.
        min_age: ageFacts.effective_min_age,
        legal_min_age: ageFacts.legal_min_age,
        employer_min_age: ageFacts.employer_min_age,
        work_state: ageFacts.work_state,
        min_age_reason: ageFacts.reasons.join('; ').slice(0, 500),
        description: v.raw.description?.slice(0, 800) ?? '',
        experience_required: 'none',
        teen_friendly_score: teenScore,
        schedule_flexibility_score: 78,
        hiring_speed_score: profile.hiring_speed_score,
        scam_risk_score: scamScore,
        commute_estimate: 30,
        physical_demand_level: 50,
        customer_interaction_level: 70,
        // Column is INTEGER — a fractional hourly rate (e.g. 15.23) would
        // fail the whole batch insert with a type error. sanitizeHourlyWage
        // also drops anything above a plausible hourly ceiling — see its
        // definition for why (a $45k/year figure passed through unchecked
        // renders as "$45000/hr" on the job card).
        salary_min: sanitizeHourlyWage(v.raw.salary_min),
        salary_max: sanitizeHourlyWage(v.raw.salary_max),
        job_type: v.raw.job_type,
        status: 'active',
        // Human-contact jobs: verified_at/last_verified_at reflect the
        // actual verification date (humanVerifiedAt), never the cron run
        // time — a daily re-touch must not look like a fresh re-check that
        // didn't happen.
        verified_at: isHumanContact ? v.raw.humanVerifiedAt : now,
        last_checked_at: now,
        http_status: v.httpStatus,
        is_active: true,
        verification_status: 'verified',
        posted_at: v.raw.posted_at ?? now,
        last_verified_at: isHumanContact ? v.raw.humanVerifiedAt : now,
        embedding: null,
      })
    }

    // One batched UPDATE for every job that already existed. Note: this
    // doesn't refresh each row's individual http_status (they'd each need a
    // different value) — that's a minor diagnostic-field tradeoff in exchange
    // for turning what used to be N sequential round-trips into 1.
    if (toUpdateIds.length > 0) {
      await supabase
        .from('jobs')
        .update({
          last_checked_at: now,
          is_active: true,
          verification_status: 'verified',
          verified_at: now,
          last_verified_at: now,
          status: 'active',
        })
        .in('id', toUpdateIds)
    }

    // Human-contact existing rows: per-row, since verified_at must come from
    // THIS row's own human_verified_at (picks up a fresh verification date
    // if the source file was updated) rather than a single shared "now" value.
    for (const { id, raw } of toUpdateHumanContact) {
      await supabase
        .from('jobs')
        .update({
          last_checked_at: now,
          is_active: true,
          verification_status: 'verified',
          verified_at: raw.humanVerifiedAt,
          last_verified_at: raw.humanVerifiedAt,
          human_reverify_by: raw.humanReverifyBy,
          contact_note: raw.contactNote ?? null,
          contact_phone: raw.contactPhone ?? null,
          contact_email: raw.contactEmail ?? null,
          status: 'active',
        })
        .eq('id', id)
    }

    // Pass-0 known-active rows skipped verification, so they get ONLY a
    // last_checked_at bump — no verified_at stamp, no status flip. Clean-jobs
    // remains the sole owner of re-verification cadence for existing jobs.
    if (knownIds.length > 0) {
      await supabase
        .from('jobs')
        .update({ last_checked_at: now })
        .in('id', knownIds)
    }

    stats.duplicate = toUpdateIds.length + toUpdateHumanContact.length + knownIds.length

    // One batched INSERT for every genuinely new job. If a single row fails
    // a constraint, Postgres can reject the whole batch — falling back to
    // one-row-at-a-time ONLY in that failure case means a single bad row
    // costs us that one row, not every good row alongside it.
    if (toInsert.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('jobs').insert(toInsert as any)
      if (!error) {
        stats.inserted = toInsert.length
      } else {
        console.log(`[ingest-pipeline/${source}] batch insert of ${toInsert.length} rows failed, falling back to per-row:`, error.message)
        if ((stats.insert_errors?.length ?? 0) < MAX_DIAGNOSTICS) stats.insert_errors?.push(`batch: ${error.message}`)
        for (const row of toInsert) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: rowError } = await supabase.from('jobs').insert(row as any)
          if (!rowError) stats.inserted++
          else if ((stats.insert_errors?.length ?? 0) < MAX_DIAGNOSTICS) {
            stats.insert_errors?.push(`${String(row.apply_url).slice(0, 60)}: ${rowError.message}`)
          }
        }
      }
    }
  }

  // alwaysVerify: deactivate live rows whose URLs just failed verification
  if (failedUrls.length > 0) {
    await supabase
      .from('jobs')
      .update({ status: 'inactive', is_active: false, verification_status: 'not_found' })
      .eq('status', 'active')
      .in('apply_url', failedUrls)
  }

  // Durable log row — non-critical, best-effort like the rest of this codebase's
  // logging. Requires the `details` jsonb column from
  // supabase/migrations/add_ingestion_log_details.sql to be applied.
  await supabase.from('ingestion_logs').insert({
    source,
    jobs_fetched: stats.fetched,
    jobs_inserted: stats.inserted,
    jobs_rejected: stats.rejected_generic + stats.rejected_url + stats.rejected_mismatch + stats.rejected_scam + stats.rejected_no_apply,
    jobs_deduplicated: stats.duplicate,
    started_at: runStartedAt,
    completed_at: new Date().toISOString(),
    details: stats,
  })

  return stats
}
