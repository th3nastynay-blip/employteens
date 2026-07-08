/**
 * EMPLOYTEENS — Production Ingestion Report (Phase 6)
 *
 * Answers exactly: how many real jobs have been imported, verified, rejected,
 * expired, and removed. Combines two views:
 *   - "current": a live snapshot of the jobs table right now
 *   - "cumulative": sums across every ingestion_logs row ever written, so the
 *     numbers survive past any single run (see lib/jobs/ingest-pipeline.ts,
 *     cron/clean-jobs, and admin/purge-jobs — all three now log here)
 *
 * GET /api/admin/stats
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const INGESTION_SOURCES = ['adzuna', 'greenhouse', 'lever', 'ashby', 'smartrecruiters', 'jsearch', 'local']

// Hudson County launch-market cities, matched against the location string.
// Order matters: 'west new york' must be checked before 'new york'.
const HUDSON_CITIES = [
  'west new york', 'jersey city', 'hoboken', 'bayonne', 'union city',
  'north bergen', 'secaucus', 'kearny', 'weehawken', 'guttenberg',
  'harrison', 'east newark',
]

interface IngestDetails {
  verified?: number
  rejected_generic?: number
  rejected_url?: number
  rejected_mismatch?: number
}

interface CleanupDetails {
  deactivated_expired?: number
  deactivated_404?: number
  deactivated_generic?: number
  duplicates_removed?: number
}

interface PurgeDetails {
  jobs_deleted?: number
}

export async function GET(req: NextRequest) {
  // Accepts Bearer header (crons, curl) OR ?secret= (browser-based ops —
  // read-only endpoint, aggregate data only). NOTE: query-param auth means
  // the secret lands in server/browser logs; acceptable only while
  // CRON_SECRET rotation is already pending. Remove ?secret= support when
  // the secret is rotated to something worth protecting.
  const auth = req.headers.get('Authorization')
  const qsSecret = req.nextUrl.searchParams.get('secret')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && qsSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // ── Current snapshot: what's actually in the jobs table right now ──────────
  const { data: allJobs } = await supabase
    .from('jobs')
    .select('source, verification_status, is_active, status, min_age, location, company')

  const bySource: Record<string, number> = {}
  const byVerificationStatus: Record<string, number> = {}
  // Launch-market coverage: visible jobs per Hudson County city
  const byHudsonCity: Record<string, number> = {}
  const visibleEmployers = new Set<string>()
  // Tracks whether the app actually has coverage across the full 14-19 teen
  // range, not just 16+ — added after discovering a 14-year-old test account
  // got zero matches because every currently-live job requires 16+.
  const byMinAgeVisible: Record<string, number> = {}
  let currentlyVerified = 0
  let currentlyActive = 0

  for (const job of allJobs ?? []) {
    bySource[job.source] = (bySource[job.source] ?? 0) + 1
    byVerificationStatus[job.verification_status] = (byVerificationStatus[job.verification_status] ?? 0) + 1
    const isVisible = job.verification_status === 'verified' && job.is_active && job.status === 'active'
    if (isVisible) {
      currentlyVerified++
      const ageKey = job.min_age <= 14 ? '14' : job.min_age === 15 ? '15' : job.min_age === 16 ? '16' : job.min_age === 17 ? '17' : '18+'
      byMinAgeVisible[ageKey] = (byMinAgeVisible[ageKey] ?? 0) + 1
      if (job.company) visibleEmployers.add(String(job.company).toLowerCase().trim())
      const loc = String(job.location ?? '').toLowerCase()
      const city = HUDSON_CITIES.find((c) => loc.includes(c))
      if (city) byHudsonCity[city] = (byHudsonCity[city] ?? 0) + 1
    }
    if (job.is_active) currentlyActive++
  }

  // ── Cumulative: sum every ingestion_logs row ever written ───────────────────
  const { data: logs } = await supabase
    .from('ingestion_logs')
    .select('source, jobs_fetched, jobs_inserted, jobs_rejected, jobs_deduplicated, details, completed_at')
    .order('completed_at', { ascending: false })
    .limit(5000)

  let totalFetched = 0
  let totalImported = 0
  let totalRejectedDuringIngestion = 0
  let totalVerifiedDuringIngestion = 0
  let totalExpiredByCleanup = 0
  let totalDuplicatesDeactivated = 0
  let totalRemovedByPurge = 0
  const perSourceTotals: Record<string, { fetched: number; imported: number; rejected: number; deduplicated: number }> = {}

  for (const log of logs ?? []) {
    // Only count `jobs_fetched` for actual ingestion-source rows — `cleanup`
    // and `purge` rows reuse that column for a different concept (jobs
    // scanned during cleanup/purge, not jobs fetched from an external API),
    // and mixing them in here would inflate this total with unrelated numbers.
    if (INGESTION_SOURCES.includes(log.source)) {
      totalFetched += log.jobs_fetched ?? 0
      totalImported += log.jobs_inserted ?? 0
      totalRejectedDuringIngestion += log.jobs_rejected ?? 0
      const details = (log.details ?? {}) as IngestDetails
      totalVerifiedDuringIngestion += details.verified ?? 0

      if (!perSourceTotals[log.source]) perSourceTotals[log.source] = { fetched: 0, imported: 0, rejected: 0, deduplicated: 0 }
      perSourceTotals[log.source].fetched += log.jobs_fetched ?? 0
      perSourceTotals[log.source].imported += log.jobs_inserted ?? 0
      perSourceTotals[log.source].rejected += log.jobs_rejected ?? 0
      perSourceTotals[log.source].deduplicated += log.jobs_deduplicated ?? 0
    } else if (log.source === 'cleanup') {
      const details = (log.details ?? {}) as CleanupDetails
      totalExpiredByCleanup += details.deactivated_expired ?? 0
      totalDuplicatesDeactivated += details.duplicates_removed ?? 0
    } else if (log.source === 'purge') {
      const details = (log.details ?? {}) as PurgeDetails
      totalRemovedByPurge += details.jobs_deleted ?? 0
    }
  }

  return NextResponse.json({
    generated_at: new Date().toISOString(),

    // Phase 6 — the exact five numbers requested
    summary: {
      imported: totalImported,
      verified: currentlyVerified,
      rejected: totalRejectedDuringIngestion,
      expired: byVerificationStatus['expired'] ?? 0,
      removed: totalRemovedByPurge,
    },

    current_snapshot: {
      total_jobs_in_table: allJobs?.length ?? 0,
      currently_visible_to_users: currentlyVerified,
      currently_active_flag: currentlyActive,
      by_source: bySource,
      by_verification_status: byVerificationStatus,
      by_min_age_of_visible_jobs: byMinAgeVisible,
      distinct_visible_employers: visibleEmployers.size,
      // Launch-market coverage — visible jobs whose location names a Hudson
      // County city. Jobs listed under a broader label ("New Jersey") don't
      // count here even if they're physically in Hudson County.
      hudson_county_by_city: byHudsonCity,
    },

    cumulative_since_tracking_began: {
      note: 'Sums every ingestion_logs row on record — resets only if that table is truncated.',
      total_fetched_across_all_sources: totalFetched,
      total_imported: totalImported,
      total_verified_at_ingest_time: totalVerifiedDuringIngestion,
      total_rejected_during_ingestion: totalRejectedDuringIngestion,
      total_expired_by_cleanup_cron: totalExpiredByCleanup,
      total_duplicates_deactivated_by_cleanup_cron: totalDuplicatesDeactivated,
      total_removed_by_purge: totalRemovedByPurge,
      by_source: perSourceTotals,
    },

    runs_considered: logs?.length ?? 0,
  })
}
