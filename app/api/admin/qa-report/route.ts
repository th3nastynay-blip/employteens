/**
 * EMPLOYTEENS — Job QA Report
 * Samples up to 50 active jobs and verifies each URL.
 * Returns a structured pass/fail report.
 *
 * GET /api/admin/qa-report
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyJobUrl } from '@/lib/jobs/verify-url'

// Hobby plan caps functions at 10s by default; 60s is the max Hobby allows.
// Re-verifying up to 50 jobs one at a time needs the extra room.
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const sampleSize = parseInt(req.nextUrl.searchParams.get('n') ?? '50')

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title, company, location, apply_url, source, verification_status, is_active')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(sampleSize)

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ error: 'No active jobs to sample', total_jobs: 0 })
  }

  const passed: { title: string; company: string; url: string; source: string }[] = []
  const failed: { title: string; company: string; url: string; source: string; reason: string; http_status: number | null }[] = []

  for (const job of jobs) {
    const result = await verifyJobUrl(job.apply_url, 8000, {
      title: job.title,
      location: job.location,
    })

    if (result.is_active) {
      passed.push({
        title: job.title,
        company: job.company,
        url: job.apply_url,
        source: job.source,
      })
    } else {
      failed.push({
        title: job.title,
        company: job.company,
        url: job.apply_url,
        source: job.source,
        reason: result.reason,
        http_status: result.http_status,
      })

      // Auto-deactivate failed jobs found during QA
      await supabase
        .from('jobs')
        .update({
          status: 'inactive',
          is_active: false,
          verification_status: result.status,
          http_status: result.http_status,
          last_checked_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    }
  }

  // Group failures by reason
  const failureReasons: Record<string, number> = {}
  for (const f of failed) {
    const category = f.http_status === 404 ? '404 Not Found'
      : f.reason.toLowerCase().includes('closed/expired/filled') ? 'Posting closed (200 but expired language)'
      : f.reason.toLowerCase().includes("doesn't match expected") ? 'Title/location mismatch'
      : f.reason.toLowerCase().includes('generic') ? 'Generic career page'
      : f.reason.toLowerCase().includes('redirect') ? 'Redirects to generic page'
      : f.reason.toLowerCase().includes('timeout') ? 'Timeout'
      : `Other (${f.http_status ?? 'no status'})`
    failureReasons[category] = (failureReasons[category] ?? 0) + 1
  }

  const report = {
    generated_at: new Date().toISOString(),
    summary: {
      total_sampled: jobs.length,
      passed: passed.length,
      failed: failed.length,
      pass_rate: `${Math.round((passed.length / jobs.length) * 100)}%`,
    },
    failure_reasons: failureReasons,
    failures: failed,
    // Don't include all passes in response to keep it readable, just count
    passed_companies: [...new Set(passed.map((p) => p.company))].sort(),
    action_taken: `Auto-deactivated ${failed.length} failing jobs`,
  }

  return NextResponse.json(report, { status: 200 })
}
