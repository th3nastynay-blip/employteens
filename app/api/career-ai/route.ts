import { NextRequest } from 'next/server'
import { getStreamingChatResponse, type ChatMessage, type JobContext } from '@/lib/ai/career-ai'
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/lib/types/database'

export async function POST(req: NextRequest) {
  const { messages } = await req.json().catch(() => ({ messages: null }))

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Missing messages' }), { status: 400 })
  }

  let userProfile: UserProfile | undefined
  let jobContext: JobContext | undefined

  // DB context is best-effort — if anything fails, still call Gemini without context
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const [profileRes, matchesRes, applicationsRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase
          .from('job_matches')
          .select('match_score, match_explanation, feed_section, jobs (id, title, company, location, apply_url, min_age, salary_min, salary_max, teen_friendly_score, hiring_speed_score, experience_required)')
          .eq('user_id', user.id)
          .order('match_score', { ascending: false })
          .limit(15),
        supabase
          .from('applications')
          .select('job_id, status, jobs (title, company)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (profileRes.data) {
        userProfile = profileRes.data as unknown as UserProfile
      }

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

      type RawApp = { status: string; jobs: { title: string; company: string } | null }
      const recentApplications = ((applicationsRes.data ?? []) as unknown as RawApp[])
        .filter((a) => a.jobs && typeof a.jobs === 'object' && !('error' in a.jobs))
        .map((a) => ({
          title: (a.jobs as { title: string; company: string })?.title,
          company: (a.jobs as { title: string; company: string })?.company,
          status: a.status,
        }))

      jobContext = { topMatches, recentApplications }
    }
  } catch (dbErr) {
    // Non-fatal — proceed without context
    console.error('[AI Coach] DB context error:', dbErr)
  }

  // Always call Gemini regardless of DB errors above
  return getStreamingChatResponse(messages as ChatMessage[], userProfile, jobContext)
}
