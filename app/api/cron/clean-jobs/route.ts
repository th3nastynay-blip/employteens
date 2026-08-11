/**
 * EMPLOYTEENS — Job Verification & Cleanup Cron
 * Runs daily at 2am via Vercel cron.
 *
 * Every run:
 * 1. Recheck all active job URLs (batch, with concurrency control)
 * 2. Deactivate 404s, generic pages, redirect-to-homepage
 * 3. Remove in-DB duplicates
 * 4. Deactivate jobs not verified in 14 days
 *
 * GET /api/cron/clean-jobs
 * Auth: Bearer CRON_SECRET (set automatically by Vercel cron)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyBatch, isGenericCareerPage } from '@/lib/jobs/verify-url'
import { runLocalIngest } from '@/lib/jobs/local-ingest'
import { runWorkdayIngest } from '@/lib/jobs/workday-ingest'
import { runSmbPhoneIngest } from '@/lib/jobs/smb-phone-ingest'

// Hobby plan caps functions at 10s by default; 60s is the max Hobby allows.
export const maxDuration = 60

const MAX_AGE_DAYS = 14      // Deactivate jobs not verified in 14 days
const BATCH_SIZE = 60         // Jobs to recheck per run — sized to fit the 60s budget above
// SCALING NOTE: since the ingest pipeline's Pass-0 change, daily ingests no
// longer refresh last_verified_at for known-active jobs — this route is the
// SOLE owner of re-verification. At 60/day, a full cycle covers 60 × 14 =
// 840 active jobs inside the MAX_AGE_DAYS window. Beyond that, healthy jobs
// start expiring before their recheck turn comes up (they'll resurrect via
// the ingest verify path, but with churn). When active count approaches
// ~800, either raise BATCH_SIZE, run this workflow twice daily (edit
// .github/workflows/clean-jobs-cron.yml — on GitHub's website, the repo
// token lacks workflow scope), or raise MAX_AGE_DAYS.

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const now = new Date()
  const results: Record<string, number> = {
    urls_rechecked: 0,
    deactivated_404: 0,
    deactivated_generic: 0,
    deactivated_expired: 0,
    duplicates_removed: 0,
  }

  // ── 0. Curated local sources (Hudson County directory) ──────────────────
  // Runs here because this route is the one on the GitHub Actions daily
  // schedule — all 4 Vercel Hobby cron slots are taken by other routes.
  // Re-verifies in-season entries, deactivates out-of-season ones.
  try {
    const localStats = await runLocalIngest(supabase)
    results.local_verified = localStats.verified
    results.local_inserted = localStats.inserted
    results.local_out_of_season = localStats.deactivated_out_of_season
  } catch (err) {
    console.log('[cron/clean-jobs] local ingest failed (continuing cleanup):', String(err).slice(0, 200))
  }

  // ── 0.5. Workday direct-employer ingestion (same scheduling constraint) ──
  try {
    const wd = await runWorkdayIngest(supabase)
    results.workday_verified = wd.verified
    results.workday_inserted = wd.inserted
  } catch (err) {
    console.log('[cron/clean-jobs] workday ingest failed (continuing cleanup):', String(err).slice(0, 200))
  }

  // ── 0.6. Call/text-to-apply small business directory (same constraint) ──
  // Human-verified phone entries only (see smb-phone-sources.ts). This also
  // enforces each entry's humanReverifyBy expiry — no URL to re-check, so
  // this daily pass IS the staleness safety net for this whole category.
  try {
    const smbPhone = await runSmbPhoneIngest(supabase)
    results.smb_phone_verified = smbPhone.verified
    results.smb_phone_inserted = smbPhone.inserted
    results.smb_phone_rejected_unverified = smbPhone.rejected_unverified_contact
    results.smb_phone_rejected_stale = smbPhone.rejected_stale_contact
  } catch (err) {
    console.log('[cron/clean-jobs] smb-phone ingest failed (continuing cleanup):', String(err).slice(0, 200))
  }

  // dejobs (McDonald's DirectEmployers) ingestion REMOVED from the daily
  // run 2026-07-13: the site serves a JS shell to server fetches — the job
  // list AND posting pages are client-rendered, so dead postings could
  // never be detected server-side. A source we can't monitor for death
  // violates the expired-link guarantee. Route kept for future use if
  // their JSON API is identified.

  // ── 1. Re-verify the oldest-checked active jobs ────────────────────────
  // apply_method='url' only — phone-contact jobs have no fetchable URL
  // (apply_url is a synthetic tel: string) and are entirely owned by
  // smb-phone-ingest.ts's own alwaysVerify cycle above. Without this filter,
  // verifyBatch would fetch() a tel: URI, get a hard error, and deactivate
  // every human-verified phone job within a day of it going live.
  const { data: jobsToCheck } = await supabase
    .from('jobs')
    .select('id, apply_url, title, company, location, source, kind')
    .eq('status', 'active')
    .eq('is_active', true)
    .eq('apply_method', 'url')
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE)

  if (jobsToCheck && jobsToCheck.length > 0) {
    const verificationResults = await verifyBatch(
      jobsToCheck.map((j) => ({
        id: j.id,
        apply_url: j.apply_url,
        title: j.title,
        location: j.location,
        company: j.company, // enables default-deny destination check
        // WHAT COUNTS AS A CURATED PROGRAMME PAGE.
        //
        // This was `j.source === 'local'`. Opportunity rows carry
        // source='opportunity', so all 31 curated competitions, programmes and
        // volunteer entries were re-verified with the STRICT job-posting rules
        // — which demand an ATS job-ID URL shape a programme page will never
        // have. They all failed and were deactivated on the first run of this
        // cron, leaving Explore with one live entry out of 31.
        //
        // Identical bug to the one in audit-jobs, in a second place. Keyed on
        // `kind` too now: it is NOT NULL with a CHECK constraint, so unlike a
        // free-text source string it cannot drift.
        programPage:
          j.source === 'local' ||
          j.source === 'opportunity' ||
          (typeof j.kind === 'string' && j.kind !== 'job'),
      })),
      4 // concurrency
    )

    results.urls_rechecked = verificationResults.length

    for (const { id, result } of verificationResults) {
      const updateData: Record<string, unknown> = {
        last_checked_at: now.toISOString(),
        http_status: result.http_status,
      }

      if (!result.is_active) {
        updateData.is_active = false
        updateData.status = 'inactive'
        updateData.verification_status = result.status

        if (result.status === 'not_found') results.deactivated_404++
        else if (result.status === 'generic' || result.status === 'redirect') results.deactivated_generic++
        else results.deactivated_404++
      } else {
        updateData.is_active = true
        updateData.verification_status = 'verified'
        updateData.verified_at = now.toISOString()
        updateData.last_verified_at = now.toISOString()
      }

      await supabase.from('jobs').update(updateData).eq('id', id)
    }
  }

  // ── 2. Immediately flag jobs with obviously generic URLs (no network call) ──
  const { data: allActive } = await supabase
    .from('jobs')
    .select('id, apply_url')
    .eq('status', 'active')

  if (allActive) {
    const genericIds = allActive
      .filter((j) => isGenericCareerPage(j.apply_url))
      .map((j) => j.id)

    if (genericIds.length > 0) {
      await supabase
        .from('jobs')
        .update({ status: 'inactive', is_active: false, verification_status: 'generic' })
        .in('id', genericIds)
      results.deactivated_generic += genericIds.length
    }
  }

  // ── 3. Deactivate jobs not verified in MAX_AGE_DAYS ──────────────────────
  // apply_method='url' only — phone jobs have their OWN expiry rule
  // (human_reverify_by, typically ~21 days, enforced by smb-phone-ingest.ts
  // above). This generic 14-day cutoff is calibrated for URL re-verification
  // cadence and would fight with that separate schedule otherwise.
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS)

  const { count: expiredCount } = await supabase
    .from('jobs')
    .update(
      { status: 'inactive', is_active: false, verification_status: 'expired' },
      { count: 'exact' },
    )
    .eq('status', 'active')
    .eq('apply_method', 'url')
    // Jobs only. A 14-day cutoff is right for a job req that dies in days and
    // wrong for an annual competition — that is exactly what
    // verify_interval_days exists to express (job 3, competition 90). Sweeping
    // opportunities into the job cadence would deactivate them every fortnight
    // no matter how healthy the link is.
    .eq('kind', 'job')
    .or(`last_verified_at.is.null,last_verified_at.lt.${cutoff.toISOString()}`)

  results.deactivated_expired = expiredCount ?? 0

  // ── 4. Remove in-DB duplicates (keep most recently verified) ─────────────
  // KEY MUST INCLUDE LOCATION: after title normalization, distinct store
  // locations share identical clean titles ("Sales Associate" @ BoxLunch),
  // and a title|company|state key deactivated 300+ legitimate jobs as
  // "duplicates" in one night. Same title + company + same LOCATION is a
  // real dupe; same title at different addresses is inventory.
  const { data: activeJobs } = await supabase
    .from('jobs')
    .select('id, title, company, state, location, verified_at')
    .eq('status', 'active')
    // Jobs only. Two Knowledge Matters entries (FCCLA and BPA) share a company
    // and a location string of 'Virtual', so a title|company|location key
    // would read curated opportunities as duplicates of each other. Dedupe is
    // for scraped inventory; the 31 opportunities were entered by hand and are
    // deliberately distinct.
    .eq('kind', 'job')
    .order('verified_at', { ascending: false })

  if (activeJobs) {
    const seen = new Map<string, string>()
    const toDeactivate: string[] = []

    for (const job of activeJobs) {
      const key = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}|${String(job.location ?? '').toLowerCase().trim()}`
      if (seen.has(key)) {
        toDeactivate.push(job.id)
      } else {
        seen.set(key, job.id)
      }
    }

    if (toDeactivate.length > 0) {
      await supabase
        .from('jobs')
        .update({ status: 'inactive', is_active: false })
        .in('id', toDeactivate)
    }
    results.duplicates_removed = toDeactivate.length
  }

  console.log('[cron/clean-jobs]', results)

  // Durable log row — non-critical, best-effort. Requires the `details` jsonb
  // column from supabase/migrations/add_ingestion_log_details.sql.
  await supabase.from('ingestion_logs').insert({
    source: 'cleanup',
    jobs_fetched: results.urls_rechecked,
    jobs_inserted: 0,
    jobs_rejected: results.deactivated_404 + results.deactivated_generic,
    jobs_deduplicated: results.duplicates_removed,
    started_at: now.toISOString(),
    completed_at: new Date().toISOString(),
    details: results,
  })

  return NextResponse.json({ success: true, timestamp: now.toISOString(), ...results })
}
