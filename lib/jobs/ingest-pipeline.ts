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
import { verifyJobUrl, isGenericCareerPage } from './verify-url'
import { getCompanyProfile, scoreTeenFriendliness, detectScamRisk } from './teen-scoring'

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
  inserted: number
  updated: number
  duplicate: number
}

const SCAM_THRESHOLD = 70

function inferState(location: string, fallback?: string): string {
  const loc = location.toLowerCase()
  if (loc.includes('new jersey') || /\bnj\b/.test(loc)) return 'NJ'
  if (loc.includes('new york') || /\bny\b/.test(loc)) return 'NY'
  return fallback ?? 'NY'
}

export async function ingestNormalizedJobs(
  supabase: SupabaseClient<Database>,
  source: string,
  rawJobs: NormalizedJob[],
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
    inserted: 0,
    updated: 0,
    duplicate: 0,
  }

  // Dedup within this batch before any network call
  const seen = new Set<string>()
  const unique = rawJobs.filter((j) => {
    if (!j.apply_url || seen.has(j.apply_url)) return false
    seen.add(j.apply_url)
    return true
  })

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
  const queue = [...unique]

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

      const verification = await verifyJobUrl(
        raw.apply_url,
        7000,
        raw.isAggregator ? { title: raw.title, location: raw.location } : undefined,
      )

      if (verification.status === 'mismatch') {
        stats.rejected_mismatch++
        continue
      }

      if (verification.status === 'no_apply_mechanism') {
        stats.rejected_no_apply++
        continue
      }

      if (!verification.is_active) {
        stats.rejected_url++
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

  if (verifiedJobs.length > 0) {
    const { data: existingRows } = await supabase
      .from('jobs')
      .select('id, apply_url')
      .in('apply_url', verifiedJobs.map((v) => v.finalUrl))

    const existingByUrl = new Map((existingRows ?? []).map((r) => [r.apply_url, r.id]))

    const toUpdateIds: string[] = []
    const toInsert: Record<string, unknown>[] = []

    for (const v of verifiedJobs) {
      const existingId = existingByUrl.get(v.finalUrl)
      if (existingId) {
        toUpdateIds.push(existingId)
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

      toInsert.push({
        title: v.raw.title,
        company: v.raw.company,
        location: v.raw.location,
        state: inferState(v.raw.location, v.raw.state),
        zip_code: v.raw.zip_code ?? '00000',
        apply_url: v.finalUrl,
        source,
        min_age: v.raw.min_age ?? profile.min_age,
        description: v.raw.description?.slice(0, 800) ?? '',
        experience_required: 'none',
        teen_friendly_score: teenScore,
        schedule_flexibility_score: 78,
        hiring_speed_score: profile.hiring_speed_score,
        scam_risk_score: scamScore,
        commute_estimate: 30,
        physical_demand_level: 50,
        customer_interaction_level: 70,
        salary_min: v.raw.salary_min,
        salary_max: v.raw.salary_max,
        job_type: v.raw.job_type,
        status: 'active',
        verified_at: now,
        last_checked_at: now,
        http_status: v.httpStatus,
        is_active: true,
        verification_status: 'verified',
        posted_at: v.raw.posted_at ?? now,
        last_verified_at: now,
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
      stats.duplicate = toUpdateIds.length
    }

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
        for (const row of toInsert) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: rowError } = await supabase.from('jobs').insert(row as any)
          if (!rowError) stats.inserted++
        }
      }
    }
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
