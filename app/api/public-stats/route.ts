/**
 * EMPLOYTEENS — Public stats (no auth)
 *
 * Powers the homepage's live numbers. Only aggregate counts — no job data,
 * no user data. Cached at the edge for 10 minutes; these numbers move a few
 * times a day at most.
 *
 * GET /api/public-stats → { active_jobs, verified_today, employers }
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * THE HOMEPAGE NUMBER MUST BE THE NUMBER THE FEED SHOWS.
 *
 * These counts used `status='active' AND is_active=true` and stopped there.
 * The feed — /api/generate-feed and the dashboard's fallback query — ALSO
 * requires `verification_status='verified'` and `scam_risk_score < 70`.
 *
 * The two predicates disagreed by an order of magnitude. Measured against
 * production on 2026-09-16: the homepage read "273 openings live right now"
 * while a signed-in teen's feed held 28 items, of which the "Paid" chip
 * matched 0 and "Near me" matched 0. The ~245-row gap is employer postings
 * sitting in the table that the URL verifier has not passed — correctly
 * hidden from teens, and wrongly counted on the marketing page.
 *
 * Anyone can check that claim in ninety seconds by signing up, and the trust
 * pitch is the entire product. So: if a teen cannot see it, we do not count
 * it. Same predicate, one source of truth.
 *
 * This makes the headline number smaller, and that is the point — it is the
 * number the product can stand behind. The way to raise it is to get employer
 * listings through verification, not to count the ones that failed.
 */
const FEED_VISIBLE = {
  status: 'active',
  is_active: true,
  verification_status: 'verified',
} as const
const MAX_SCAM_RISK = 70

export async function GET() {
  try {
    const supabase = await createAdminClient()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [activeRes, verifiedTodayRes, companiesRes, inReviewRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .match(FEED_VISIBLE)
        .lt('scam_risk_score', MAX_SCAM_RISK),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .match(FEED_VISIBLE)
        .lt('scam_risk_score', MAX_SCAM_RISK)
        .gte('last_verified_at', startOfDay.toISOString()),
      supabase
        .from('jobs')
        .select('company')
        .match(FEED_VISIBLE)
        .lt('scam_risk_score', MAX_SCAM_RISK),
      // The backlog: alive in the table, not yet through URL verification, so
      // no teen can see it. Reported separately rather than folded into the
      // headline, because the whole point is that these two are different.
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('is_active', true)
        .or('verification_status.is.null,verification_status.neq.verified'),
    ])

    const employers = new Set((companiesRes.data ?? []).map((r) => (r.company as string)?.toLowerCase().trim())).size

    return NextResponse.json(
      {
        active_jobs: activeRes.count ?? 0,
        verified_today: verifiedTodayRes.count ?? 0,
        in_review: inReviewRes.count ?? 0,
        employers,
      },
      // Was s-maxage=600, stale-while-revalidate=1200 — up to ~30 min of a
      // STALE homepage number after any bulk dedup/cleanup/audit run (real
      // gap found 2026-07-25: homepage said 581, live count was 166 — a
      // trust-audit sweep had just dropped hundreds of rows and the edge
      // cache hadn't caught up). This is the exact number the product's own
      // trust pitch leans on, so a 3.5x-stale value sitting for half an
      // hour is a real problem, not a cosmetic one. Shortened so it
      // self-heals fast without removing caching entirely.
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
    )
  } catch {
    return NextResponse.json({ active_jobs: 0, verified_today: 0, in_review: 0, employers: 0 })
  }
}
