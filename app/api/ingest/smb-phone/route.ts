/**
 * EMPLOYTEENS — Call/Text-to-Apply Small Business Ingestion
 *
 * Ingests lib/jobs/smb-phone-sources.ts's human-verified entries (only
 * humanVerifiedAt !== null) through the shared pipeline, same as
 * /api/ingest/local — see lib/jobs/smb-phone-ingest.ts for the verification
 * branch (no URL to fetch; legitimacy rests on the human-verification trail).
 *
 * SCHEDULING: runs daily inside /api/cron/clean-jobs (Vercel Hobby's 4 cron
 * slots are all taken). This route exists for manual triggers — e.g. right
 * after flipping an entry's humanVerifiedAt in the source file, to see it go
 * live without waiting for the next scheduled run.
 *
 * POST /api/ingest/smb-phone
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { runSmbPhoneIngest } from '@/lib/jobs/smb-phone-ingest'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Bearer OR ?secret= — same rotation caveat as admin/stats and
  // /api/ingest/local: remove query-param auth when CRON_SECRET is rotated.
  const auth = req.headers.get('Authorization')
  const qsSecret = req.nextUrl.searchParams.get('secret')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && qsSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const result = await runSmbPhoneIngest(supabase)
  return NextResponse.json({ success: true, ...result })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
