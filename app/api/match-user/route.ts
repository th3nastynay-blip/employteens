/**
 * EMPLOYTEENS — On-demand match generator for a single user
 * Called from Step11Processing immediately after onboarding save.
 * Runs the match engine against all active jobs and stores results in job_matches.
 *
 * POST /api/match-user  { user_id: string }
 * Auth: cookies (must be authenticated as the user)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { computeMatchScore } from '@/lib/ai/match-engine'
import type { UserProfile, JobRow } from '@/lib/types/database'

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json()

    // Verify the caller is the user themselves (or admin via cron secret)
    const isCron = req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`

    if (!isCron) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== user_id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const supabase = await createAdminClient()

    // Fetch the user profile
    const { data: userRow } = await supabase
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single()

    if (!userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userProfile = userRow as unknown as UserProfile

    // Fetch all active jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'active')
      .lt('scam_risk_score', 70)
      .order('created_at', { ascending: false })
      .limit(500)

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No jobs in database yet', matches: 0 })
    }

    const matches: {
      user_id: string
      job_id: string
      match_score: number
      match_explanation: string
      feed_section: string
      generated_at: string
    }[] = []

    // Missing age = assume 14 (most restrictive), never "no filter"
    const effectiveAge = userProfile.age ?? 14

    for (const job of jobs as JobRow[]) {
      if (effectiveAge < job.min_age) continue

      const { match_score, match_explanation, feed_section } = computeMatchScore(userProfile, job)
      if (match_score < 30) continue

      matches.push({
        user_id,
        job_id: job.id,
        match_score,
        match_explanation,
        feed_section,
        generated_at: new Date().toISOString(),
      })
    }

    // ALWAYS clear old matches — even when zero new ones qualify. Leaving
    // the stale cache in place when matches.length === 0 kept serving jobs
    // that no longer pass the filters.
    await supabase.from('job_matches').delete().eq('user_id', user_id)
    if (matches.length > 0) {
      await supabase.from('job_matches').insert(matches)
    }

    return NextResponse.json({
      success: true,
      matches_generated: matches.length,
      jobs_scanned: jobs.length,
    })
  } catch (err) {
    console.error('[match-user]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
