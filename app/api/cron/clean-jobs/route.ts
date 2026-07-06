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

// Hobby plan caps functions at 10s by default; 60s is the max Hobby allows.
export const maxDuration = 60

const MAX_AGE_DAYS = 14      // Deactivate jobs not verified in 14 days
const BATCH_SIZE = 60         // Jobs to recheck per run — sized to fit the 60s budget above

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

  // ── 1. Re-verify the oldest-checked active jobs ────────────────────────
  const { data: jobsToCheck } = await supabase
    .from('jobs')
    .select('id, apply_url, title, company, location')
    .eq('status', 'active')
    .eq('is_active', true)
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE)

  if (jobsToCheck && jobsToCheck.length > 0) {
    const verificationResults = await verifyBatch(
      jobsToCheck.map((j) => ({ id: j.id, apply_url: j.apply_url, title: j.title, location: j.location })),
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
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS)

  const { count: expiredCount } = await supabase
    .from('jobs')
    .update(
      { status: 'inactive', is_active: false, verification_status: 'expired' },
      { count: 'exact' },
    )
    .eq('status', 'active')
    .or(`last_verified_at.is.null,last_verified_at.lt.${cutoff.toISOString()}`)

  results.deactivated_expired = expiredCount ?? 0

  // ── 4. Remove in-DB duplicates (keep most recently verified) ─────────────
  const { data: activeJobs } = await supabase
    .from('jobs')
    .select('id, title, company, state, verified_at')
    .eq('status', 'active')
    .order('verified_at', { ascending: false })

  if (activeJobs) {
    const seen = new Map<string, string>()
    const toDeactivate: string[] = []

    for (const job of activeJobs) {
      const key = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}|${job.state}`
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
