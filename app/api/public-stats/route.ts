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

export async function GET() {
  try {
    const supabase = await createAdminClient()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [activeRes, verifiedTodayRes, companiesRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('is_active', true),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('is_active', true)
        .gte('last_verified_at', startOfDay.toISOString()),
      supabase
        .from('jobs')
        .select('company')
        .eq('status', 'active')
        .eq('is_active', true),
    ])

    const employers = new Set((companiesRes.data ?? []).map((r) => (r.company as string)?.toLowerCase().trim())).size

    return NextResponse.json(
      {
        active_jobs: activeRes.count ?? 0,
        verified_today: verifiedTodayRes.count ?? 0,
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
    return NextResponse.json({ active_jobs: 0, verified_today: 0, employers: 0 })
  }
}
