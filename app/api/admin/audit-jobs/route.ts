/**
 * EMPLOYTEENS — Trust Audit (one-time backfill + rerunnable)
 *
 * Applies the strict trust rules to jobs already in the table:
 *   1. Re-verifies each active job's URL under the strict rules
 *      (aggregator final destinations, search pages, no apply flow,
 *      non-specific postings, expired language → flagged)
 *   2. Rewrites titles to product quality (clean role name) and extracts
 *      structured tags — original title preserved in a machine tag
 *   3. Computes the Job Quality Score; below MIN_QUALITY_SCORE → flagged
 *
 * Flagged ≠ deleted: status='flagged' hides the job from every user-facing
 * query but keeps the row for review/reversal.
 *
 * Batched to fit the 60s function limit. Call repeatedly until
 * `remaining` is 0; each call processes the oldest-audited slice.
 * Already-audited jobs are marked with the `_audited:v1` tag and skipped,
 * so repeated calls walk the whole table exactly once.
 *
 * POST /api/admin/audit-jobs?secret=CRON_SECRET[&batch=40][&dry=1]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyJobUrl } from '@/lib/jobs/verify-url'
import { cleanJobTitle } from '@/lib/jobs/clean-title'
import { isTeenAppropriateTitle, teenTitleVerdict, MAX_TEEN_AGE } from '@/lib/jobs/teen-scoring'
import { resolveAllAgeFacts } from '@/lib/jobs/child-labor'
import { isInMarket } from '@/lib/jobs/geo'
import { computeQualityScore, qualityTag, MIN_QUALITY_SCORE } from '@/lib/jobs/quality-score'

export const maxDuration = 60

// v4 (2026-08-01): account-wall detection + tightened isTrustedDestination
// (full-company-name match instead of any single generic token) — same
// reasoning as the v3 bump: a rules change means every previously-audited
// row needs a fresh pass, or it silently keeps whatever verdict the OLD
// rules gave it forever. Re-audits EVERYTHING again.
// v5: age re-resolution. Every v4 row was aged by the company-name-only
// heuristic, so they all need a second pass against the new description-aware
// resolver.
//
// v7 (2026-08-10): the v6 run did damage and this pass is partly a repair.
//
// v6 ran on ~206 rows before it was stopped. On those rows an unmatched
// occupation fell through to the 16 default and OVERWROTE stricter existing
// values — "Associate Fire Protection Inspector II", "AIU Psychologist" and
// "Renew Crew APSW – Heavy Duty", all City of New York municipal postings,
// went from 18 down to 16. Two things were wrong at once: resolveAllAgeFacts
// dropped its `matched` flag so callers could not tell a verdict from a
// fallthrough, and isTeenAppropriateTitle was a pure blocklist that passed
// every title it had never seen.
//
// Both are fixed (the ratchet below, and teenTitleVerdict). BE HONEST ABOUT
// THE LIMIT: the ratchet cannot undo v6, because the pre-v6 value is gone from
// the row. What repairs those rows is the title whitelist — a municipal
// inspector post is not a teen job at any age, so the age it carries stops
// mattering once the row is out of the feed.
const AUDIT_MARK = '_audited:v7'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  const qsSecret = req.nextUrl.searchParams.get('secret')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && qsSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const batchSize = Math.min(60, parseInt(req.nextUrl.searchParams.get('batch') ?? '40', 10) || 40)
  const dryRun = req.nextUrl.searchParams.get('dry') === '1'

  const supabase = await createAdminClient()

  // REVIVE-DEDUPE MODE: the nightly dedupe used a title|company|state key,
  // which — after title normalization — collapsed distinct store locations
  // into one key and deactivated 300+ legitimate jobs as "duplicates".
  // Those rows kept verification_status='verified' (only status/is_active
  // were flipped), which distinguishes them from genuinely dead rows.
  // This mode: (1) reactivates inactive+verified rows, (2) immediately
  // re-runs dedupe with the corrected title|company|LOCATION key.
  if (req.nextUrl.searchParams.get('mode') === 'revive-dedupe') {
    const { count: revived } = await supabase
      .from('jobs')
      .update({ status: 'active', is_active: true }, { count: 'exact' })
      .eq('status', 'inactive')
      .eq('is_active', false)
      .eq('verification_status', 'verified')

    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('id, title, company, location, verified_at')
      .eq('status', 'active')
      .order('verified_at', { ascending: false })

    const seen = new Set<string>()
    const dupes: string[] = []
    for (const j of activeJobs ?? []) {
      const key = `${j.title.toLowerCase().trim()}|${j.company.toLowerCase().trim()}|${String(j.location ?? '').toLowerCase().trim()}`
      if (seen.has(key)) dupes.push(j.id)
      else seen.add(key)
    }
    if (dupes.length > 0) {
      await supabase.from('jobs').update({ status: 'inactive', is_active: false }).in('id', dupes)
    }

    return NextResponse.json({
      success: true,
      mode: 'revive-dedupe',
      revived: revived ?? 0,
      re_deduplicated: dupes.length,
      net_restored: (revived ?? 0) - dupes.length,
    })
  }

  // RECONSIDER MODE: geo false positives ("Belleville, Essex County" is NJ)
  // were flagged before county-form locations were recognized. Walk flagged
  // rows; anything that now passes the cheap gates goes back to active
  // WITHOUT the audit mark, so the normal pass re-verifies it fully.
  if (req.nextUrl.searchParams.get('mode') === 'reconsider') {
    const { data: flaggedRows } = await supabase
      .from('jobs')
      .select('id, title, company, location, source, kind, tags')
      .eq('status', 'flagged')
      .limit(1000)

    let restored = 0
    for (const j of flaggedRows ?? []) {
      const isProgram = j.source === 'local' || j.source === 'opportunity' || (typeof j.kind === 'string' && j.kind !== 'job')
      if (isProgram || (isInMarket(j.location) && isTeenAppropriateTitle(j.title))) {
        restored++
        await supabase.from('jobs').update({
          status: 'active',
          is_active: true,
          tags: (((j.tags as string[] | null) ?? []).filter((t) => !t.startsWith('_audited:') && !t.startsWith('_q:'))),
        }).eq('id', j.id)
      }
    }
    return NextResponse.json({ success: true, mode: 'reconsider', flagged_total: flaggedRows?.length ?? 0, restored })
  }

  // Pull unaudited active jobs. Tag containment filter runs in SQL; the
  // NOT is applied client-side because PostgREST's negated contains on
  // arrays is awkward — so fetch a window and filter.
  const { data: candidates } = await supabase
    .from('jobs')
    .select('id, title, company, location, apply_url, source, kind, job_type, tags, scam_risk_score, salary_min, description, posted_at, min_age')
    .eq('status', 'active')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(400)

  const unaudited = (candidates ?? []).filter((j) => !((j.tags as string[] | null) ?? []).includes(AUDIT_MARK))
  const batch = unaudited.slice(0, batchSize)

  const counters = {
    audited: 0,
    kept: 0,
    flagged_aggregator: 0,
    flagged_no_apply: 0,
    flagged_account_wall: 0,
    flagged_expired_or_dead: 0,
    flagged_generic_or_search: 0,
    flagged_low_quality: 0,
    flagged_not_teen_job: 0,
    flagged_out_of_market: 0,
    // Rows whose min_age was wrong — see the age re-resolution block below.
    flagged_over_age: 0,
    age_corrected: 0,
    // Rows that got YOUNGER. This is legal 14 and 15 inventory the old
    // heuristic was hiding, and it is the number worth watching.
    age_unlocked: 0,
    // Rows where the fallthrough default WOULD have lowered an existing,
    // stricter age and the ratchet stopped it. A non-zero number here means
    // the occupation rules have a gap worth filling.
    age_held: 0,
    // Rows no occupation rule recognised at all. Tagged '_age:unmatched'.
    age_unmatched: 0,
    // Titles matching neither the adult blocklist nor the teen whitelist.
    title_unknown: 0,
    title_unknown_samples: [] as string[],
    // Legal below 16 but employer policy unconfirmed: the outreach call list.
    verify_candidates: 0,
    retitled: 0,
    quality_scores: [] as number[],
    samples: [] as { before: string; after: string; company: string; action: string; quality: number }[],
    age_samples: [] as { company: string; title: string; from: number; to: number; why: string }[],
  }

  const queue = [...batch]
  const CONCURRENCY = 6

  async function worker() {
    while (queue.length > 0) {
      const job = queue.shift()
      if (!job) break
      counters.audited++

      // WHAT COUNTS AS A CURATED ENTRY — read this before changing it.
      //
      // This was `job.source === 'local'`. Opportunity rows carry
      // source='opportunity' (see lib/jobs/opportunity-ingest.ts), so every
      // curated competition, programme and volunteer entry fell through to the
      // ORDINARY JOB pipeline. The geo gate then asked isInMarket('Virtual'),
      // got false, and flagged all of them. The Extracurriculars page went to
      // "0 open now" while the calendar still showed 22, because the calendar
      // reads the seed and the cards read the database.
      //
      // Keyed on `kind` now as well as source. kind is a NOT NULL column with
      // a CHECK constraint, so it cannot drift the way a free-text source
      // string did.
      const isProgram =
        job.source === 'local' ||
        job.source === 'opportunity' ||
        (typeof job.kind === 'string' && job.kind !== 'job')

      // Out-of-market: a California job is useless to a Hudson County teen.
      // (Legacy rows got in via a substring bug — 'ny' matched "Sunnyvale".)
      if (!isProgram && !isInMarket(job.location)) {
        counters.flagged_out_of_market++
        counters.quality_scores.push(0)
        if (counters.samples.length < 8) {
          counters.samples.push({ before: job.title, after: job.title, company: job.company, action: `flagged (out of market: ${job.location})`, quality: 0 })
        }
        if (!dryRun) {
          await supabase.from('jobs').update({
            status: 'flagged',
            is_active: false,
            tags: [...(((job.tags as string[] | null) ?? []).filter((t) => t !== AUDIT_MARK)), '_q:0', AUDIT_MARK],
            last_checked_at: new Date().toISOString(),
          }).eq('id', job.id)
        }
        continue
      }

      // Titles we do not recognise at all. Counted and tagged, NOT flagged —
      // the blocklist-to-whitelist change is new and flagging on its first run
      // could hide a large slice of legitimate inventory over a regex gap.
      // Run with dry=1, read title_unknown and title_unknown_samples, then
      // decide whether to start flagging. Measure before you destroy.
      let titleUnknownTag: string | null = null
      if (!isProgram && teenTitleVerdict(job.title as string) === 'unknown') {
        counters.title_unknown++
        titleUnknownTag = '_title:unreviewed'
        if (counters.title_unknown_samples.length < 20) {
          counters.title_unknown_samples.push(`${job.company} — ${String(job.title).slice(0, 60)}`)
        }
      }

      // Adult roles (VP, Director, Engineer, Bartender…) have no business on
      // a teen job board regardless of how legitimate the posting is. Cheap
      // check first — skips the network fetch entirely.
      if (!isProgram && !isTeenAppropriateTitle(job.title)) {
        counters.flagged_not_teen_job++
        counters.quality_scores.push(0)
        if (counters.samples.length < 8) {
          counters.samples.push({ before: job.title, after: job.title, company: job.company, action: 'flagged (not a teen job)', quality: 0 })
        }
        if (!dryRun) {
          await supabase.from('jobs').update({
            status: 'flagged',
            is_active: false,
            tags: [...(((job.tags as string[] | null) ?? []).filter((t) => t !== AUDIT_MARK)), '_q:0', AUDIT_MARK],
            last_checked_at: new Date().toISOString(),
          }).eq('id', job.id)
        }
        continue
      }

      // AGE RE-RESOLUTION.
      // Every row already in the table got its min_age from the old
      // company-name-only heuristic, which never read the description and
      // could never return above 16. So live rows exist right now that say
      // "16+" on a posting whose own text says "must be 18". This re-derives
      // the age from the description and corrects the row in place. Program
      // pages keep their hand-verified age.
      let ageUpdate: Record<string, unknown> | null = null
      let unmatchedTag: string | null = null
      if (!isProgram) {
        const facts = resolveAllAgeFacts({
          title: job.title as string,
          company: job.company as string,
          description: job.description as string | null,
          location: job.location as string | null,
        })

        // THE RATCHET.
        //
        // When no occupation rule matched, resolveLegalMinAge falls through to
        // 16. That is a placeholder, not a finding — and on the v6 run it did
        // real damage: "Associate Fire Protection Inspector II", "AIU
        // Psychologist" and "Renew Crew APSW – Heavy Duty" all fell through
        // and were rewritten from 18 DOWN to 16, which would have published
        // municipal professional roles to 16-year-olds.
        //
        // So: a guess may RAISE a gate but never lower one. Only a matched
        // occupation rule, or the employer's own stated age, is allowed to
        // relax what is already on the row.
        const isGuess = !facts.legal_matched && facts.employer_min_age === null
        const existingAge = typeof job.min_age === 'number' ? job.min_age : facts.effective_min_age
        const resolvedAge = isGuess
          ? Math.max(existingAge, facts.effective_min_age)
          : facts.effective_min_age
        if (isGuess && resolvedAge !== facts.effective_min_age) counters.age_held++

        ageUpdate = {
          min_age: resolvedAge,
          legal_min_age: facts.legal_min_age,
          employer_min_age: facts.employer_min_age,
          work_state: facts.work_state,
          min_age_reason: facts.reasons.join('; ').slice(0, 500),
        }

        // An unrecognised occupation is a row we know nothing about. Tag it so
        // it is queryable for review instead of sitting in the feed looking
        // exactly like a row we actually checked.
        if (isGuess) {
          counters.age_unmatched++
          unmatchedTag = '_age:unmatched'
        }

        if (resolvedAge !== job.min_age) {
          counters.age_corrected++
          // Rows moving DOWN are the commercially interesting ones: legally
          // 14-eligible work the old company-name-only heuristic was hiding.
          if (resolvedAge < (job.min_age as number)) counters.age_unlocked++
          if (counters.age_samples.length < 8) {
            counters.age_samples.push({
              company: job.company as string,
              title: String(job.title).slice(0, 60),
              from: job.min_age as number,
              to: resolvedAge,
              why: facts.reasons.join('; ').slice(0, 160),
            })
          }
        }

        // Legal at 14 or 15 but the employer's own policy is unconfirmed.
        // That is the outreach call list, not a reason to hide the row.
        if (facts.legal_min_age < 16 && facts.employer_min_age === null) {
          counters.verify_candidates++
        }

        // Above 19 nobody on the platform can apply. Flag rather than silently
        // leave it visible to the oldest users.
        if (resolvedAge > MAX_TEEN_AGE) {
          counters.flagged_over_age++
          if (!dryRun) {
            await supabase.from('jobs').update({
              ...ageUpdate,
              status: 'flagged',
              is_active: false,
              tags: [...(((job.tags as string[] | null) ?? []).filter((t) => t !== AUDIT_MARK)), '_q:0', AUDIT_MARK],
              last_checked_at: new Date().toISOString(),
            }).eq('id', job.id)
          }
          continue
        }
      }

      const verification = await verifyJobUrl(
        job.apply_url,
        7000,
        isProgram ? undefined : { title: job.title, location: job.location, company: job.company },
        isProgram ? { programPage: true } : undefined,
      )

      const cleaned = cleanJobTitle(job.title)
      const quality = computeQualityScore({
        apply_url: job.apply_url,
        company: job.company,
        title_confidence: cleaned.confidence,
        scam_risk_score: job.scam_risk_score ?? 0,
        salary_min: job.salary_min,
        description: job.description,
        posted_at: job.posted_at,
        is_curated: isProgram,
      })
      counters.quality_scores.push(quality.score)

      let action: 'kept' | 'flagged' = 'kept'
      let flagReason = ''

      if (!verification.is_active) {
        action = 'flagged'
        if (verification.status === 'aggregator') { counters.flagged_aggregator++; flagReason = 'aggregator' }
        else if (verification.status === 'no_apply_mechanism') { counters.flagged_no_apply++; flagReason = 'no apply flow' }
        else if (verification.status === 'account_wall') { counters.flagged_account_wall++; flagReason = 'requires account/sign-in to apply' }
        else if (verification.status === 'generic' || verification.status === 'redirect') { counters.flagged_generic_or_search++; flagReason = 'generic/search page' }
        else { counters.flagged_expired_or_dead++; flagReason = 'expired or dead' }
      } else if (quality.score < MIN_QUALITY_SCORE) {
        action = 'flagged'
        counters.flagged_low_quality++
        flagReason = `quality ${quality.score} < ${MIN_QUALITY_SCORE}`
      }

      const newTags = Array.from(new Set([
        ...((job.tags as string[] | null) ?? []).filter((t) => !t.startsWith('_q:') && !t.startsWith('_audited:') && !t.startsWith('_orig:') && t !== '_age:unmatched' && t !== '_title:unreviewed'),
        ...cleaned.tags,
        qualityTag(quality.score),
        AUDIT_MARK,
        ...(unmatchedTag ? [unmatchedTag] : []),
        ...(titleUnknownTag ? [titleUnknownTag] : []),
        ...(cleaned.title !== job.title ? [`_orig:${String(job.title).slice(0, 80)}`] : []),
      ]))

      const retitled = cleaned.title !== job.title && cleaned.confidence >= 60
      if (retitled) counters.retitled++
      if (action === 'kept') counters.kept++

      if (counters.samples.length < 8 && (retitled || action === 'flagged')) {
        counters.samples.push({
          before: job.title,
          after: retitled ? cleaned.title : job.title,
          company: job.company,
          action: action === 'flagged' ? `flagged (${flagReason})` : 'kept',
          quality: quality.score,
        })
      }

      if (!dryRun) {
        const update: Record<string, unknown> = {
          tags: newTags,
          last_checked_at: new Date().toISOString(),
        }
        if (retitled) update.title = cleaned.title
        if (ageUpdate) Object.assign(update, ageUpdate)
        if (action === 'flagged') {
          update.status = 'flagged'
          update.is_active = false
          update.verification_status = verification.is_active ? 'unverified' : verification.status
        } else {
          update.verification_status = 'verified'
          update.last_verified_at = new Date().toISOString()
          update.verified_at = new Date().toISOString()
        }
        await supabase.from('jobs').update(update).eq('id', job.id)
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  const avg = counters.quality_scores.length
    ? Math.round(counters.quality_scores.reduce((a, b) => a + b, 0) / counters.quality_scores.length)
    : 0

  // Log the run so stats survive
  if (!dryRun && counters.audited > 0) {
    await supabase.from('ingestion_logs').insert({
      source: 'audit',
      jobs_fetched: counters.audited,
      jobs_inserted: 0,
      jobs_rejected: counters.audited - counters.kept,
      jobs_deduplicated: 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      details: { ...counters, quality_scores: undefined, avg_quality: avg },
    })
  }

  return NextResponse.json({
    success: true,
    dry_run: dryRun,
    processed: counters.audited,
    kept: counters.kept,
    flagged: counters.audited - counters.kept,
    breakdown: {
      aggregator: counters.flagged_aggregator,
      no_apply_flow: counters.flagged_no_apply,
      account_wall: counters.flagged_account_wall,
      expired_or_dead: counters.flagged_expired_or_dead,
      generic_or_search: counters.flagged_generic_or_search,
      low_quality: counters.flagged_low_quality,
      not_teen_job: counters.flagged_not_teen_job,
      out_of_market: counters.flagged_out_of_market,
      over_age: counters.flagged_over_age,
    },
    retitled: counters.retitled,
    // How many live rows had the wrong minimum age. A non-zero number here on
    // the first run is the size of the "sent a 16-year-old to an 18+ job" bug.
    age_corrected: counters.age_corrected,
    age_unlocked: counters.age_unlocked,
    age_held: counters.age_held,
    age_unmatched: counters.age_unmatched,
    title_unknown: counters.title_unknown,
    title_unknown_samples: counters.title_unknown_samples,
    verify_candidates: counters.verify_candidates,
    age_samples: counters.age_samples,
    avg_quality_score: avg,
    remaining: Math.max(0, unaudited.length - batch.length),
    samples: counters.samples,
  })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
