/**
 * EMPLOYTEENS — Daily Feed Generator
 * Called by cron: generates match scores for all users
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { computeMatchScore } from '@/lib/ai/match-engine'
import type { UserProfile, JobRow } from '@/lib/types/database'

// Hobby plan caps functions at 10s by default; 60s is the max Hobby allows.
// This loops every onboarded user against every active job.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // Fetch only verified active jobs — no unverified URLs in the feed
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'active')
    .eq('is_active', true)
    .eq('verification_status', 'verified')
    .lt('scam_risk_score', 70)
    .order('verified_at', { ascending: false })
    .limit(500)

  if (jobsError || !jobs) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }

  // Fetch all users with completed onboarding
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('onboarding_completed', true)

  if (!users || users.length === 0) {
    return NextResponse.json({ message: 'No users to process', users: 0 })
  }

  let processed = 0
  let matched = 0

  for (const user of users) {
    const userProfile = user as unknown as UserProfile
    const userMatches: {
      user_id: string
      job_id: string
      match_score: number
      match_explanation: string
      feed_section: string
      generated_at: string
    }[] = []

    // No age on profile = most restrictive assumption (14), NOT no filter.
    // The old `age && age < min_age` check silently disabled age filtering
    // for pre-onboarding users, caching 16+ jobs that persisted after the
    // user set their age to 14.
    const effectiveAge = userProfile.age ?? 14

    for (const job of jobs as JobRow[]) {
      // Skip ineligible by age
      if (effectiveAge < job.min_age) continue
      // Skip cross-state if walking/biking
      const transport = (user as { transportation?: string }).transportation
      if (transport === 'walking' || transport === 'bike') {
        if (userProfile.state !== job.state) continue
      }

      const { match_score, match_explanation, feed_section } = computeMatchScore(userProfile, job)
      if (match_score < 40) continue

      userMatches.push({
        user_id: user.id,
        job_id: job.id,
        match_score,
        match_explanation,
        feed_section,
        generated_at: new Date().toISOString(),
      })
    }

    // Delete-then-insert (not upsert): upsert left stale rows behind forever,
    // so jobs flagged/expired AFTER a cache write kept appearing in feeds —
    // the "expired links in my feed" bug.
    await supabase.from('job_matches').delete().eq('user_id', user.id)
    if (userMatches.length > 0) {
      await supabase.from('job_matches').insert(userMatches)
      matched += userMatches.length
    }

    processed++
  }

  return NextResponse.json({
    success: true,
    users_processed: processed,
    matches_generated: matched,
    jobs_scanned: jobs.length,
  })
}

// Allow GET for manual dev trigger
export async function GET(req: NextRequest) {
  return POST(req)
}
