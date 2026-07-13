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
  const supabase = await createAdminClient()
  const stats = await runDejobsIngest(supabase)
  return NextResponse.json({ success: true, ...stats })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
