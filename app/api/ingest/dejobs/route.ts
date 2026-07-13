/**
 * EMPLOYTEENS — McDonald's DirectEmployers ingestion trigger
 * Logic in lib/jobs/dejobs-ingest.ts (also runs daily inside clean-jobs).
 * POST /api/ingest/dejobs   Auth: Bearer CRON_SECRET or ?secret=
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { runDejobsIngest } from '@/lib/jobs/dejobs-ingest'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  const qsSecret = req.nextUrl.searchParams.get('secret')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && qsSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ?debug=1 → return a sample of the raw HTML Vercel receives, so parser
  // failures are distinguishable from bot-blocking without guessing.
  if (req.nextUrl.searchParams.get('debug') === '1') {
    const res = await fetch('https://mcdonalds.dejobs.org/locations/new-jersey/jobs/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
    })
    const html = await res.text()
    const jobIdx = html.search(/\/job\//i)
    return NextResponse.json({
      http_status: res.status,
      length: html.length,
      head: html.slice(0, 400),
      around_first_job_path: jobIdx >= 0 ? html.slice(Math.max(0, jobIdx - 300), jobIdx + 100) : 'NO /job/ PATH IN HTML',
    })
  }

  const supabase = await createAdminClient()
  const stats = await runDejobsIngest(supabase)
  return NextResponse.json({ success: true, ...stats })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
