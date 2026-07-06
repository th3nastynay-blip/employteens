/**
 * EMPLOYTEENS — Purge all jobs with generic/unverified URLs
 * POST /api/admin/purge-jobs
 * Auth: Bearer CRON_SECRET
 *
 * The seed data contained 45 jobs with generic career homepage URLs
 * (e.g. https://careers.mcdonalds.com) — not specific job postings.
 * This route wipes them so we can start fresh with verified data only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // Delete all jobs from curated/seed source that have generic homepage URLs.
  // A specific job posting URL always contains a job ID or unique path segment.
  // Generic pages look like: /careers, /jobs (with no further path).
  const { data: allJobs } = await supabase
    .from('jobs')
    .select('id, apply_url, source')

  if (!allJobs) {
    return NextResponse.json({ error: 'Could not fetch jobs' }, { status: 500 })
  }

  const genericPatterns = [
    /^https?:\/\/[^/]+\/?$/,                    // just a domain
    /^https?:\/\/[^/]+\/careers\/?$/i,           // /careers
    /^https?:\/\/[^/]+\/careers\/?\?/i,          // /careers?...
    /^https?:\/\/[^/]+\/jobs\/?$/i,              // /jobs (no specific ID)
    /^https?:\/\/[^/]+\/en\/careers\/?$/i,       // /en/careers
    /^https?:\/\/[^/]+\/us\/en\/?$/i,            // /us/en
    /^https?:\/\/[^/]+\/job-opportunities\/?$/i, // /job-opportunities
    /^https?:\/\/[^/]+\/fans\/[^/]+\/?$/i,       // /fans/five-guys-jobs etc
    /^https?:\/\/[^/]+\/page\/careers/i,         // /page/careers
    /^https?:\/\/[^/]+\/home\/about-us\/careers/i,
    /^https?:\/\/[^/]+\/en\/company\/careers/i,
    /^https?:\/\/[^/]+\/CareersAndFranchise\/careers/i,
    /^https?:\/\/[^/]+\/static\/en-US\/careers\/?$/i,
    /^https?:\/\/[^/]+\/site\/[^/]+\/jobs-and-internships\//i,
    /^https?:\/\/[^/]+\/site\/dycd\//i,
  ]

  const toDelete: string[] = []
  const toKeep: string[] = []

  for (const job of allJobs) {
    const url = job.apply_url ?? ''
    const isGeneric = genericPatterns.some((p) => p.test(url))
    if (isGeneric || job.source === 'curated') {
      toDelete.push(job.id)
    } else {
      toKeep.push(job.id)
    }
  }

  let deleted = 0
  if (toDelete.length > 0) {
    // Also remove related job_matches
    await supabase.from('job_matches').delete().in('job_id', toDelete)
    const { error } = await supabase.from('jobs').delete().in('id', toDelete)
    if (!error) deleted = toDelete.length
  }

  // Durable log row — this is what /api/admin/stats sums for "number removed".
  // jobs_deleted lives in `details`, NOT jobs_rejected — that column means
  // something different for ingestion-source rows (URLs rejected during
  // ingestion) and we don't want to conflate the two when aggregating.
  await supabase.from('ingestion_logs').insert({
    source: 'purge',
    jobs_fetched: allJobs.length,
    jobs_inserted: 0,
    jobs_rejected: 0,
    jobs_deduplicated: 0,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    details: { jobs_deleted: deleted, jobs_kept: toKeep.length, total_scanned: allJobs.length },
  })

  return NextResponse.json({
    success: true,
    jobs_deleted: deleted,
    jobs_kept: toKeep.length,
    total_scanned: allJobs.length,
  })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
