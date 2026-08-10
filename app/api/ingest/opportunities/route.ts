/**
 * EMPLOYTEENS — opportunity ingest endpoint
 *
 * GET /api/ingest/opportunities?secret=CRON_SECRET[&recheck=1][&month=8]
 *
 * Syncs the curated opportunity seed into the jobs table, moves seasonal
 * entries in and out of season, and (with recheck=1) retires dead links.
 *
 * Safe to run repeatedly: entries are matched on apply_url, so a second run
 * updates rather than duplicates.
 *
 * Suggested schedule in vercel.json: weekly. These are annual competitions and
 * rolling programs, not job reqs — running it nightly would add nothing except
 * load on other people's servers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { runOpportunityIngest } from '@/lib/jobs/opportunity-ingest'
import { OPPORTUNITY_SOURCES } from '@/lib/jobs/opportunity-sources'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  const qs = req.nextUrl.searchParams.get('secret')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && qs !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recheckLinks = req.nextUrl.searchParams.get('recheck') === '1'
  const monthParam = req.nextUrl.searchParams.get('month')
  const month = monthParam ? Math.max(1, Math.min(12, parseInt(monthParam, 10))) : undefined

  const supabase = await createAdminClient()
  const result = await runOpportunityIngest(supabase, { recheckLinks, month })

  const { count: liveCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'opportunity')
    .eq('status', 'active')

  return NextResponse.json({
    success: true,
    seed_size: OPPORTUNITY_SOURCES.length,
    live_now: liveCount ?? 0,
    ...result,
    note: recheckLinks
      ? 'Link recheck ran. Only hard 404 and 410 retire an entry — a timeout or a 403 to a non-browser agent is not evidence the opportunity is gone.'
      : 'Add &recheck=1 to verify links. Skipped by default so the sync stays fast.',
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
