/**
 * EMPLOYTEENS — Purge all jobs from a given source
 * POST /api/admin/purge-source?source=adzuna,jsearch
 * Auth: Bearer CRON_SECRET
 *
 * Written 2026-08-01 when adzuna and jsearch were unwired from the daily
 * cron (see their route files) — unwiring stops NEW bad rows from either
 * source, but every row they already inserted is still live in the jobs
 * table until something deletes it. This does that: hard-deletes every job
 * (and its job_matches) whose `source` column matches one of the given
 * names. Distinct from /api/admin/purge-jobs, which targets generic-URL
 * rows regardless of source — this one targets entire sources by name, for
 * exactly this "we're done with this source" situation.
 *
 * Safe to call with a single source too: ?source=adzuna
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  const qsSecret = req.nextUrl.searchParams.get('secret')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && qsSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sourceParam = req.nextUrl.searchParams.get('source')
  if (!sourceParam) {
    return NextResponse.json(
      { error: 'Missing ?source= query param (comma-separated source names, e.g. ?source=adzuna,jsearch)' },
      { status: 400 },
    )
  }
  const sources = sourceParam.split(',').map((s) => s.trim()).filter(Boolean)
  if (sources.length === 0) {
    return NextResponse.json({ error: 'No valid source names provided' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  const { data: matching, error: selectError } = await supabase
    .from('jobs')
    .select('id')
    .in('source', sources)

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }

  const ids = (matching ?? []).map((r) => r.id)
  let deleted = 0

  if (ids.length > 0) {
    await supabase.from('job_matches').delete().in('job_id', ids)
    const { error: deleteError } = await supabase.from('jobs').delete().in('id', ids)
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message, jobs_found: ids.length }, { status: 500 })
    }
    deleted = ids.length
  }

  await supabase.from('ingestion_logs').insert({
    source: 'purge-source',
    jobs_fetched: ids.length,
    jobs_inserted: 0,
    jobs_rejected: 0,
    jobs_deduplicated: 0,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    details: { sources_purged: sources, jobs_deleted: deleted },
  })

  return NextResponse.json({ success: true, sources_purged: sources, jobs_deleted: deleted })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
