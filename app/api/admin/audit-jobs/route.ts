/**
 * EMPLOYTEENS — Trust Audit (one-time backfill + rerunnable)
 *
 * Applies the strict trust rules to jobs already in the table:
 *   1. Re-verifies each active job's URL under the strict rules
 *      (aggregator final destinations, search pages, no apply flow,
 *      non-specific postings, expired language → flagged)
 *   2. Rewrites titles to product quality (clean role name) and extracts
 *      structured tags — original title preserved in a machine tag
 *   3. Computes the Job Quality Score; below MIN_QUALITY_SCORE → flagged
 *
 * Flagged ≠ deleted: status='flagged' hides the job from every user-facing
 * query but keeps the row for review/reversal.
 *
 * Batched to fit the 60s function limit. Call repeatedly until
 * `remaining` is 0; each call processes the oldest-audited slice.
 * Already-audited jobs are marked with the `_audited:v1` tag and skipped,
 * so repeated calls walk the whole table exactly once.
 *
 * POST /api/admin/audit-jobs?secret=CRON_SECRET[&batch=40][&dry=1]
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyJobUrl } from '@/lib/jobs/verify-url'
import { cleanJobTitle } from '@/lib/jobs/clean-title'
import { isTeenAppropriateTitle } from '@/lib/jobs/teen-scoring'
import { isInMarket } from '@/lib/jobs/geo'
import { computeQualityScore, qualityTag, MIN_QUALITY_SCORE } from '@/lib/jobs/quality-score'

export const maxDuration = 60

// v2: re-audits everything processed under v1 — the v1 cleaner left trailing
// comma-locations ("Operations Associate, Bronx,") on ~100 rows.
const AUDIT_MARK = '_audited:v2'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  const qsSecret = req.nextUrl.searchParams.get('secret')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && qsSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const batchSize = Math.min(60, parseInt(req.nextUrl.searchParams.get('batch') ?? '40', 10) || 40)
  const dryRun = req.nextUrl.searchParams.get('dry') === '1'

  const supabase = await createAdminClient()

  // REVIVE-DEDUPE MODE: the nightly dedupe used a title|company|state key,
  // which — after title normalization — collapsed distinct store locations
  // into one key and deactivated 300+ legitimate jobs as "duplicates".
  // Those rows kept verification_status='verified' (only status/is_active
  // were flipped), which distinguishes them from genuinely dead rows.
  // This mode: (1) reactivates inactive+verified rows, (2) immediately
  // re-runs dedupe with the corrected title|company|LOCATION key.
  if (req.nextUrl.searchParams.get('mode') === 'revive-dedupe') {
    const { count: revived } = await supabase
      .from('jobs')
      .update({ status: 'active', is_active: true }, { count: 'exact' })
      .eq('status', 'inactive')
      .eq('is_active', false)
      .eq('verification_status', 'verified')

    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('id, title, company, location, verified_at')
      .eq('status', 'active')
      .order('verified_at', { ascending: false })

    const seen = new Set<string>()
    const dupes: string[] = []
    for (const j of activeJobs ?? []) {
      const key = `${j.title.toLowerCase().trim()}|${j.company.toLowerCase().trim()}|${String(j.location ?? '').toLowerCase().trim()}`
      if (seen.has(key)) dupes.push(j.id)
      else seen.add(key)
    }
    if (dupes.length > 0) {
      await supabase.from('jobs').update({ status: 'inactive', is_active: false }).in('id', dupes)
    }

    return NextResponse.json({
      success: true,
      mode: 'revive-dedupe',
      revived: revived ?? 0,
      re_deduplicated: dupes.length,
      net_restored: (revived ?? 0) - dupes.length,
    })
  }

  // RECONSIDER MODE: geo false positives ("Belleville, Essex County" is NJ)
  // were flagged before county-form locations were recognized. Walk flagged
  // rows; anything that now passes the cheap gates goes back to active
  // WITHOUT the audit mark, so the normal pass re-verifies it fully.
  if (req.nextUrl.searchParams.get('mode') === 'reconsider') {
    const { data: flaggedRows } = await supabase
      .from('jobs')
      .select('id, title, company, location, source, tags')
      .eq('status', 'flagged')
      .limit(1000)

    let restored = 0
    for (const j of flaggedRows ?? []) {
      const isProgram = j.source === 'local'
      if (isProgram || (isInMarket(j.location) && isTeenAppropriateTitle(j.title))) {
        restored++
        await supabase.from('jobs').update({
          status: 'active',
          is_active: true,
          tags: (((j.tags as string[] | null) ?? []).filter((t) => !t.startsWith('_audited:') && !t.startsWith('_q:'))),
        }).eq('id', j.id)
      }
    }
    return NextResponse.json({ success: true, mode: 'reconsider', flagged_total: flaggedRows?.length ?? 0, restored })
  }

  // Pull unaudited active jobs. Tag containment filter runs in SQL; the
  // NOT is applied client-side because PostgREST's negated contains on
  // arrays is awkward — so fetch a window and filter.
  const { data: candidates } = await supabase
    .from('jobs')
    .select('id, title, company, location, apply_url, source, job_type, tags, scam_risk_score, salary_min, description, posted_at')
    .eq('status', 'active')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(400)

  const unaudited = (candidates ?? []).filter((j) => !((j.tags as string[] | null) ?? []).includes(AUDIT_MARK))
  const batch = unaudited.slice(0, batchSize)

  const counters = {
    audited: 0,
    kept: 0,
    flagged_aggregator: 0,
    flagged_no_apply: 0,
    flagged_expired_or_dead: 0,
    flagged_generic_or_search: 0,
    flagged_low_quality: 0,
    flagged_not_teen_job: 0,
    flagged_out_of_market: 0,
    retitled: 0,
    quality_scores: [] as number[],
    samples: [] as { before: string; after: string; company: string; action: string; quality: number }[],
  }

  const queue = [...batch]
  const CONCURRENCY = 6

  async function worker() {
    while (queue.length > 0) {
      const job = queue.shift()
      if (!job) break
      counters.audited++

      const isProgram = job.source === 'local'

      // Out-of-market: a California job is useless to a Hudson County teen.
      // (Legacy rows got in via a substring bug — 'ny' matched "Sunnyvale".)
      if (!isProgram && !isInMarket(job.location)) {
        counters.flagged_out_of_market++
        counters.quality_scores.push(0)
        if (counters.samples.length < 8) {
          counters.samples.push({ before: job.title, after: job.title, company: job.company, action: `flagged (out of market: ${job.location})`, quality: 0 })
        }
        if (!dryRun) {
          await supabase.from('jobs').update({
            status: 'flagged',
            is_active: false,
            tags: [...(((job.tags as string[] | null) ?? []).filter((t) => t !== AUDIT_MARK)), '_q:0', AUDIT_MARK],
            last_checked_at: new Date().toISOString(),
          }).eq('id', job.id)
        }
        continue
      }

      // Adult roles (VP, Director, Engineer, Bartender…) have no business on
      // a teen job board regardless of how legitimate the posting is. Cheap
      // check first — skips the network fetch entirely.
      if (!isProgram && !isTeenAppropriateTitle(job.title)) {
        counters.flagged_not_teen_job++
        counters.quality_scores.push(0)
        if (counters.samples.length < 8) {
          counters.samples.push({ before: job.title, after: job.title, company: job.company, action: 'flagged (not a teen job)', quality: 0 })
        }
        if (!dryRun) {
          await supabase.from('jobs').update({
            status: 'flagged',
            is_active: false,
            tags: [...(((job.tags as string[] | null) ?? []).filter((t) => t !== AUDIT_MARK)), '_q:0', AUDIT_MARK],
            last_checked_at: new Date().toISOString(),
          }).eq('id', job.id)
        }
        continue
      }

      const verification = await verifyJobUrl(
        job.apply_url,
        7000,
        isProgram ? undefined : { title: job.title, location: job.location },
        isProgram ? { programPage: true } : undefined,
      )

      const cleaned = cleanJobTitle(job.title)
      const quality = computeQualityScore({
        apply_url: job.apply_url,
        company: job.company,
        title_confidence: cleaned.confidence,
        scam_risk_score: job.scam_risk_score ?? 0,
        salary_min: job.salary_min,
        description: job.description,
        posted_at: job.posted_at,
        is_curated: isProgram,
      })
      counters.quality_scores.push(quality.score)

      let action: 'kept' | 'flagged' = 'kept'
      let flagReason = ''

      if (!verification.is_active) {
        action = 'flagged'
        if (verification.status === 'aggregator') { counters.flagged_aggregator++; flagReason = 'aggregator' }
        else if (verification.status === 'no_apply_mechanism') { counters.flagged_no_apply++; flagReason = 'no apply flow' }
        else if (verification.status === 'generic' || verification.status === 'redirect') { counters.flagged_generic_or_search++; flagReason = 'generic/search page' }
        else { counters.flagged_expired_or_dead++; flagReason = 'expired or dead' }
      } else if (quality.score < MIN_QUALITY_SCORE) {
        action = 'flagged'
        counters.flagged_low_quality++
        flagReason = `quality ${quality.score} < ${MIN_QUALITY_SCORE}`
      }

      const newTags = Array.from(new Set([
        ...((job.tags as string[] | null) ?? []).filter((t) => !t.startsWith('_q:') && !t.startsWith('_audited:') && !t.startsWith('_orig:')),
        ...cleaned.tags,
        qualityTag(quality.score),
        AUDIT_MARK,
        ...(cleaned.title !== job.title ? [`_orig:${String(job.title).slice(0, 80)}`] : []),
      ]))

      const retitled = cleaned.title !== job.title && cleaned.confidence >= 60
      if (retitled) counters.retitled++
      if (action === 'kept') counters.kept++

      if (counters.samples.length < 8 && (retitled || action === 'flagged')) {
        counters.samples.push({
          before: job.title,
          after: retitled ? cleaned.title : job.title,
          company: job.company,
          action: action === 'flagged' ? `flagged (${flagReason})` : 'kept',
          quality: quality.score,
        })
      }

      if (!dryRun) {
        const update: Record<string, unknown> = {
          tags: newTags,
          last_checked_at: new Date().toISOString(),
        }
        if (retitled) update.title = cleaned.title
        if (action === 'flagged') {
          update.status = 'flagged'
          update.is_active = false
          update.verification_status = verification.is_active ? 'unverified' : verification.status
        } else {
          update.verification_status = 'verified'
          update.last_verified_at = new Date().toISOString()
          update.verified_at = new Date().toISOString()
        }
        await supabase.from('jobs').update(update).eq('id', job.id)
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  const avg = counters.quality_scores.length
    ? Math.round(counters.quality_scores.reduce((a, b) => a + b, 0) / counters.quality_scores.length)
    : 0

  // Log the run so stats survive
  if (!dryRun && counters.audited > 0) {
    await supabase.from('ingestion_logs').insert({
      source: 'audit',
      jobs_fetched: counters.audited,
      jobs_inserted: 0,
      jobs_rejected: counters.audited - counters.kept,
      jobs_deduplicated: 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      details: { ...counters, quality_scores: undefined, avg_quality: avg },
    })
  }

  return NextResponse.json({
    success: true,
    dry_run: dryRun,
    processed: counters.audited,
    kept: counters.kept,
    flagged: counters.audited - counters.kept,
    breakdown: {
      aggregator: counters.flagged_aggregator,
      no_apply_flow: counters.flagged_no_apply,
      expired_or_dead: counters.flagged_expired_or_dead,
      generic_or_search: counters.flagged_generic_or_search,
      low_quality: counters.flagged_low_quality,
      not_teen_job: counters.flagged_not_teen_job,
      out_of_market: counters.flagged_out_of_market,
    },
    retitled: counters.retitled,
    avg_quality_score: avg,
    remaining: Math.max(0, unaudited.length - batch.length),
    samples: counters.samples,
  })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
