/**
 * EMPLOYTEENS — Local-sources ingest runner
 *
 * Lives in lib/ (not the route file) because Next.js app-router route files
 * may only export HTTP handlers — and this needs to be callable from BOTH
 * /api/ingest/local (manual trigger) and /api/cron/clean-jobs (the GitHub
 * Actions daily schedule; all 4 Vercel Hobby cron slots are taken).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { ingestNormalizedJobs, type NormalizedJob } from '@/lib/jobs/ingest-pipeline'
import { inSeasonEntries, outOfSeasonEntries } from '@/lib/jobs/local-sources'

export async function runLocalIngest(supabase: SupabaseClient<Database>) {
  const month = new Date().getMonth() + 1

  // 1. Deactivate out-of-season entries (no network calls needed). They
  // reactivate automatically when their window returns — the pipeline's
  // update path flips is_active back on for existing rows.
  const offSeason = outOfSeasonEntries(month)
  let deactivated_out_of_season = 0
  if (offSeason.length > 0) {
    const { count } = await supabase
      .from('jobs')
      .update(
        { status: 'inactive', is_active: false, verification_status: 'expired' },
        { count: 'exact' },
      )
      .eq('source', 'local')
      .eq('status', 'active')
      .in('apply_url', offSeason.map((e) => e.apply_url))
    deactivated_out_of_season = count ?? 0
  }

  // 2. Ingest in-season entries through the shared pipeline (programPage
  // verification mode: liveness + closed-language, no ATS job-ID check).
  const normalized: NormalizedJob[] = inSeasonEntries(month).map((e) => ({
    title: e.title,
    company: e.company,
    location: e.location,
    state: e.state,
    zip_code: e.zip_code,
    apply_url: e.apply_url,
    description: e.description,
    min_age: e.min_age,
    job_type: e.job_type,
    salary_min: e.salary_min,
    salary_max: e.salary_max,
    isProgramPage: true,
  }))

  const stats = await ingestNormalizedJobs(supabase, 'local', normalized)
  return { ...stats, deactivated_out_of_season }
}
