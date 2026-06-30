/**
 * Supabase Edge Function — runs job-cleaner on schedule
 * Deploy: supabase functions deploy cron-clean-jobs
 * Schedule: supabase functions schedule add cron-clean-jobs --cron "0 */12 * * *"
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SCAM_THRESHOLD = 70
const MAX_AGE_DAYS = 7

serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const results: Record<string, number> = {}

  // 1. Flag high scam risk jobs
  const { count: flagged } = await supabase
    .from('jobs')
    .update({ status: 'flagged' })
    .gte('scam_risk_score', SCAM_THRESHOLD)
    .eq('status', 'active')
    .select('count')
  results.flagged = flagged ?? 0

  // 2. Mark unverified jobs inactive
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - MAX_AGE_DAYS)

  const { count: expired } = await supabase
    .from('jobs')
    .update({ status: 'inactive' })
    .eq('status', 'active')
    .lt('last_verified_at', cutoff.toISOString())
    .select('count')
  results.expired = expired ?? 0

  // 3. Log the run
  await supabase.from('ingestion_logs').insert({
    source: 'cron_cleaner',
    jobs_fetched: 0,
    jobs_inserted: 0,
    jobs_rejected: (results.flagged ?? 0) + (results.expired ?? 0),
    jobs_deduplicated: 0,
    completed_at: new Date().toISOString(),
  })

  return new Response(JSON.stringify({ success: true, ...results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
