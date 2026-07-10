/**
 * EMPLOYTEENS — Workday ingestion trigger
 * Logic lives in lib/jobs/workday-ingest.ts (also invoked by clean-jobs daily).
 * POST /api/ingest/workday   Auth: Bearer CRON_SECRET or ?secret=
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { runWorkdayIngest } from '@/lib/jobs/workday-ingest'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  const qsSecret = req.nextUrl.searchParams.get('secret')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && qsSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = await createAdminClient()
  const stats = await runWorkdayIngest(supabase)
  return NextResponse.json({ success: true, ...stats })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
