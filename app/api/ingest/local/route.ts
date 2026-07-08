/**
 * EMPLOYTEENS — Curated Local Sources Ingestion (Hudson County)
 *
 * Ingests the researched directory in lib/jobs/local-sources.ts through the
 * SAME shared pipeline as every API source (normalize → verify → dedupe →
 * insert/refresh). The only difference is verification mode: these are
 * program pages, so verify-url.ts runs in programPage mode (liveness +
 * closed-language checks, no ATS job-ID requirement).
 *
 * SCHEDULING: Vercel Hobby allows 4 crons and all 4 are taken, so this
 * runs daily inside /api/cron/clean-jobs (triggered by the GitHub Actions
 * workflow). This route exists for manual triggers and backfills.
 *
 * POST /api/ingest/local
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { runLocalIngest } from '@/lib/jobs/local-ingest'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Bearer OR ?secret= — same rotation caveat as admin/stats: remove
  // query-param auth when CRON_SECRET is rotated.
  const auth = req.headers.get('Authorization')
  const qsSecret = req.nextUrl.searchParams.get('secret')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && qsSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const result = await runLocalIngest(supabase)
  return NextResponse.json({ success: true, ...result })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
