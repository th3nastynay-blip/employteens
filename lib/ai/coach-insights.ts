/**
 * EMPLOYTEENS — Proactive Coach Insights
 *
 * Pure functions that turn platform data the user already generated
 * (applications, availability, fresh verified jobs) into proactive,
 * specific nudges. Consumed two ways:
 *   1. /api/coach-insights → career page renders them as tappable chips
 *   2. career-ai.ts system prompt → the model opens with what matters today
 *
 * Rule: every insight must be computed from REAL data. No fake precision,
 * no invented counts. If we can't compute it honestly, we don't say it.
 */

export interface CoachInsight {
  /** Stable type for dedupe/analytics */
  type: 'interview_prep' | 'offer' | 'follow_up' | 'new_jobs' | 'weekend_gap' | 'young_teen_paths'
  /** Short text shown on the chip */
  text: string
  /** The message sent to the coach when the user taps the chip */
  prompt: string
}

export interface InsightInputs {
  age: number | null
  /** availability object from the user profile, e.g. { saturday: true } */
  availability: Record<string, boolean> | null
  applications: {
    title?: string
    company?: string
    status: string
    updated_at?: string | null
  }[]
  /** Active verified jobs created in the last 48h that the user is old enough for */
  freshJobCount: number
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function buildCoachInsights(input: InsightInputs): CoachInsight[] {
  const insights: CoachInsight[] = []

  // 1. Interview coming up — highest priority, most time-sensitive
  const interviewing = input.applications.find((a) => a.status === 'interviewing')
  if (interviewing) {
    insights.push({
      type: 'interview_prep',
      text: `Interview at ${interviewing.company ?? 'your job'} — want to prep?`,
      prompt: `I have an interview for ${interviewing.title ?? 'a job'} at ${interviewing.company ?? 'a company'}. Help me prepare — what will they ask and how should I answer?`,
    })
  }

  // 2. Offer on the table
  const offered = input.applications.find((a) => a.status === 'offered')
  if (offered) {
    insights.push({
      type: 'offer',
      text: `You got an offer from ${offered.company ?? 'an employer'} 🎉`,
      prompt: `I got a job offer from ${offered.company ?? 'an employer'} for ${offered.title ?? 'a position'}. What should I check before accepting, and how do I handle my first week?`,
    })
  }

  // 3. Stale application worth following up (5–14 days, sweet spot for a nudge)
  const stale = input.applications.find((a) => {
    if (a.status !== 'applied') return false
    const d = daysSince(a.updated_at)
    return d !== null && d >= 5 && d <= 14
  })
  if (stale) {
    const d = daysSince(stale.updated_at)
    insights.push({
      type: 'follow_up',
      text: `You applied to ${stale.company ?? 'a job'} ${d} days ago — follow up?`,
      prompt: `I applied to ${stale.title ?? 'a job'} at ${stale.company ?? 'a company'} ${d} days ago and haven't heard back. How should I follow up?`,
    })
  }

  // 4. Fresh verified jobs (only when the count is real and non-zero)
  if (input.freshJobCount > 0) {
    insights.push({
      type: 'new_jobs',
      text: `${input.freshJobCount} new verified job${input.freshJobCount === 1 ? '' : 's'} since yesterday`,
      prompt: `What are the newest jobs that match my profile? Which should I apply to first?`,
    })
  }

  // 5. Weekend availability gap — qualitative, because that's what's honest.
  // Most teen retail/food shifts are weekend-heavy; we don't pretend to know
  // the exact number of jobs it would unlock.
  const av = input.availability
  if (av && !av.saturday && !av.sunday && input.applications.length > 0) {
    insights.push({
      type: 'weekend_gap',
      text: 'No weekend availability set — that limits your matches',
      prompt: `My profile has no weekend availability. How much does that limit my options, and what should I do if I can actually work some weekends?`,
    })
  }

  // 6. Honest paths for 14–15 year olds
  if (input.age !== null && input.age <= 15) {
    insights.push({
      type: 'young_teen_paths',
      text: `Best real options at ${input.age} in Hudson County`,
      prompt: `I'm ${input.age}. What are my realistic job options right now, including city youth programs and volunteer-to-paid paths?`,
    })
  }

  return insights.slice(0, 3)
}
