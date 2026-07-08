/**
 * EMPLOYTEENS — Coach context fetcher
 *
 * One place that assembles everything the AI Coach knows about a user:
 * profile, top matches, application history WITH timestamps, saved jobs,
 * fresh verified job count, and computed proactive insights. Used by both
 * /api/career-ai (chat) and /api/coach-insights (proactive chips) so the
 * two never drift apart.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, UserProfile } from '@/lib/types/database'
import { buildCoachInsights, type CoachInsight } from './coach-insights'
import type { JobContext } from './career-ai'

export interface CoachContext {
  userProfile?: UserProfile
  jobContext?: JobContext
  insights: CoachInsight[]
}

export async function fetchCoachContext(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CoachContext> {
  const twoDaysAgo = new Date(Date.now() - 48 * 3600_000).toISOString()

  const [profileRes, matchesRes, applicationsRes] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase
      .from('job_matches')
      .select('match_score, match_explanation, feed_section, jobs (id, title, company, location, apply_url, min_age, salary_min, salary_max, teen_friendly_score, hiring_speed_score, experience_required)')
      .eq('user_id', userId)
      .order('match_score', { ascending: false })
      .limit(15),
    supabase
      .from('applications')
      .select('job_id, status, created_at, updated_at, jobs (title, company)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(15),
  ])

  const userProfile = (profileRes.data as unknown as UserProfile) ?? undefined

  // Fresh verified jobs the user is old enough for (real count, not vibes)
  let freshJobCount = 0
  try {
    let query = supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_active', true)
      .gte('created_at', twoDaysAgo)
    if (userProfile?.age) query = query.lte('min_age', userProfile.age)
    if (userProfile?.state) query = query.eq('state', userProfile.state)
    const { count } = await query
    freshJobCount = count ?? 0
  } catch { /* stays 0 */ }

  type RawMatch = {
    match_score: number
    match_explanation: string | null
    jobs: {
      title: string; company: string; location: string; apply_url: string
      min_age: number; salary_min: number | null; salary_max: number | null
      hiring_speed_score: number; experience_required: string
    }
  }
  const topMatches = ((matchesRes.data ?? []) as unknown as RawMatch[])
    .filter((m) => m.jobs && typeof m.jobs === 'object' && !('error' in m.jobs))
    .map((m) => ({
      title: m.jobs.title,
      company: m.jobs.company,
      location: m.jobs.location,
      match_score: m.match_score,
      match_explanation: m.match_explanation ?? '',
      apply_url: m.jobs.apply_url,
      min_age: m.jobs.min_age,
      pay: m.jobs.salary_min
        ? `$${m.jobs.salary_min}–$${m.jobs.salary_max ?? m.jobs.salary_min}/hr`
        : null,
      hires_fast: m.jobs.hiring_speed_score >= 80,
      no_experience: m.jobs.experience_required === 'none',
    }))

  type RawApp = {
    status: string
    created_at: string
    updated_at?: string | null
    jobs: { title: string; company: string } | null
  }
  const apps = ((applicationsRes.data ?? []) as unknown as RawApp[])
    .filter((a) => a.jobs && typeof a.jobs === 'object' && !('error' in a.jobs))
    .map((a) => ({
      title: a.jobs?.title,
      company: a.jobs?.company,
      status: a.status,
      updated_at: a.updated_at ?? a.created_at,
    }))

  const jobContext: JobContext = {
    topMatches,
    recentApplications: apps,
  }

  const insights = buildCoachInsights({
    age: userProfile?.age ?? null,
    availability: (userProfile?.availability as Record<string, boolean>) ?? null,
    applications: apps,
    freshJobCount,
  })

  return { userProfile, jobContext, insights }
}
