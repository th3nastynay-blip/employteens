/**
 * EMPLOYTEENS — AI Match Engine
 * Scores jobs 0-100 for a specific user based on:
 * - Age compatibility (highest weight: 30%)
 * - Schedule overlap (25%)
 * - Location/commute (20%)
 * - Interest alignment (15%)
 * - Experience match (10%)
 */

import type { UserProfile, JobRow, JobMatch } from '@/lib/types/database'

interface MatchResult {
  match_score: number
  match_explanation: string
  feed_section: 'best_matches' | 'new_near_you' | 'high_probability'
}

// =============================================
// SCORING WEIGHTS
// =============================================
const WEIGHTS = {
  age_eligibility: 0.30,
  schedule_overlap: 0.25,
  location_commute: 0.20,
  interest_alignment: 0.15,
  experience_match: 0.10,
}

// =============================================
// AGE ELIGIBILITY SCORE (0-100)
// =============================================
function scoreAge(user: UserProfile, job: JobRow): number {
  if (!user.age) return 50
  if (user.age < job.min_age) return 0 // Hard block — ineligible
  if (user.age >= job.min_age) return 100
  return 50
}

// =============================================
// SCHEDULE OVERLAP SCORE (0-100)
// =============================================
function scoreSchedule(user: UserProfile, job: JobRow): number {
  const availability = user.availability as Record<string, boolean>

  // Base: job's flexibility score
  let score = job.schedule_flexibility_score

  // Boost if user has weekend availability (most teen jobs are weekend-heavy)
  const hasWeekend = availability?.saturday || availability?.sunday
  if (hasWeekend) score = Math.min(100, score + 10)

  // Boost if user is available evenings (school_end_time)
  const endHour = parseInt((user.school_end_time ?? '3:00 PM').split(':')[0])
  const isPM = (user.school_end_time ?? '').includes('PM')
  const endHour24 = isPM && endHour !== 12 ? endHour + 12 : endHour

  if (endHour24 <= 14) score = Math.min(100, score + 15) // Out early = more availability
  if (endHour24 >= 17) score = Math.max(0, score - 10) // Out late = less availability

  return score
}

// =============================================
// LOCATION SCORE (0-100) based on ZIP proximity
// =============================================
function scoreLocation(user: UserProfile, job: JobRow): number {
  // Same ZIP = perfect
  if (user.zip_code === job.zip_code) return 100

  // Same state = decent
  if (user.state === job.state) {
    // Estimate proximity from ZIP prefix (rough)
    const userPrefix = user.zip_code.slice(0, 3)
    const jobPrefix = job.zip_code.slice(0, 3)
    if (userPrefix === jobPrefix) return 85
    return 65
  }

  // Cross-state (NY/NJ border is common and doable)
  return 45
}

// =============================================
// INTEREST ALIGNMENT SCORE (0-100)
// =============================================
function scoreInterests(user: UserProfile, job: JobRow): number {
  const userInterests = (user.interests as string[]) ?? []
  const title = job.title.toLowerCase()
  const company = job.company.toLowerCase()
  const tags = (job.tags ?? []) as string[]

  const INTEREST_KEYWORDS: Record<string, string[]> = {
    'Food & Restaurants': ['restaurant', 'food', 'pizza', 'chipotle', 'mcdonald', 'starbucks', 'barista', 'crew', 'kitchen', 'cook'],
    'Retail & Shopping': ['retail', 'store', 'cashier', 'sales associate', 'target', 'walmart', 'mall'],
    'Sports & Fitness': ['gym', 'fitness', 'planet fitness', 'equinox', 'crunch', 'lifeguard', 'pool'],
    'Entertainment & Movies': ['amc', 'regal', 'theater', 'movie', 'entertainment', 'cinema'],
    'Technology': ['tech', 'computer', 'software', 'it support', 'help desk'],
    'Healthcare & Childcare': ['childcare', 'babysit', 'camp', 'tutor', 'aide'],
    'Arts & Music': ['art', 'music', 'design', 'creative', 'photography'],
    'Customer Service': ['customer service', 'front desk', 'host', 'receptionist'],
    'Delivery & Logistics': ['delivery', 'driver', 'logistics', 'package'],
    'Tutoring & Education': ['tutor', 'teacher', 'camp counselor', 'education'],
  }

  let matches = 0
  for (const interest of userInterests) {
    const keywords = INTEREST_KEYWORDS[interest] ?? []
    const matched = keywords.some((kw) =>
      title.includes(kw) || company.includes(kw)
    )
    if (matched) matches++
  }

  if (userInterests.length === 0) return 60
  return Math.min(100, 50 + (matches / userInterests.length) * 50)
}

// =============================================
// EXPERIENCE MATCH SCORE (0-100)
// =============================================
function scoreExperience(user: UserProfile, job: JobRow): number {
  const userExp = (user as UserProfile & { experience_required?: string }).experience_required ?? 'none'

  if (job.experience_required === 'none') return 100
  if (job.experience_required === 'preferred') {
    if (userExp === 'none') return 75 // Still can apply
    return 95
  }
  if (job.experience_required === '1_year') {
    if (userExp === 'none') return 45
    if (userExp === 'some_volunteering') return 60
    if (userExp === 'one_job') return 90
    return 100
  }

  return 70 // default
}

// =============================================
// EXPLANATION GENERATOR
// =============================================
function generateExplanation(
  user: UserProfile,
  job: JobRow,
  scores: Record<string, number>
): string {
  const parts: string[] = []

  if (scores.schedule_overlap >= 80) {
    parts.push(`Great schedule match for your ${user.school_end_time} dismissal`)
  }
  if (scores.age_eligibility === 100 && job.min_age <= 15) {
    parts.push(`Hires at ${job.min_age}!`)
  }
  if (job.hiring_speed_score >= 85) {
    parts.push('known for fast hiring')
  }
  if (scores.interest_alignment >= 80) {
    parts.push('matches your interests')
  }
  if (scores.location_commute >= 85) {
    parts.push('very close to you')
  }
  if (job.schedule_flexibility_score >= 85) {
    parts.push('flexible hours')
  }

  if (parts.length === 0) return `Good match based on your profile and location.`

  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
  return [first, ...parts.slice(1)].join(' · ') + '.'
}

// =============================================
// DETERMINE FEED SECTION
// =============================================
function determineFeedSection(
  score: number,
  job: JobRow,
  locationScore: number
): MatchResult['feed_section'] {
  if (score >= 75) return 'best_matches'
  if (locationScore >= 80) return 'new_near_you'
  if (job.hiring_speed_score >= 80) return 'high_probability'
  return 'best_matches'
}

// =============================================
// MAIN MATCH FUNCTION
// =============================================
export function computeMatchScore(user: UserProfile, job: JobRow): MatchResult {
  // Hard blocks
  if (user.age && user.age < job.min_age) {
    return {
      match_score: 0,
      match_explanation: 'Age requirement not met.',
      feed_section: 'best_matches',
    }
  }

  const scores = {
    age_eligibility: scoreAge(user, job),
    schedule_overlap: scoreSchedule(user, job),
    location_commute: scoreLocation(user, job),
    interest_alignment: scoreInterests(user, job),
    experience_match: scoreExperience(user, job),
  }

  const weightedScore =
    scores.age_eligibility * WEIGHTS.age_eligibility +
    scores.schedule_overlap * WEIGHTS.schedule_overlap +
    scores.location_commute * WEIGHTS.location_commute +
    scores.interest_alignment * WEIGHTS.interest_alignment +
    scores.experience_match * WEIGHTS.experience_match

  const match_score = Math.round(Math.min(100, Math.max(0, weightedScore)))
  const match_explanation = generateExplanation(user, job, scores)
  const feed_section = determineFeedSection(match_score, job, scores.location_commute)

  return { match_score, match_explanation, feed_section }
}

// =============================================
// BATCH MATCH — generate full feed for a user
// =============================================
export function generateFeedForUser(user: UserProfile, jobs: JobRow[]): JobMatch[] {
  const matches: JobMatch[] = []

  for (const job of jobs) {
    const { match_score, match_explanation } = computeMatchScore(user, job)
    if (match_score === 0) continue // Skip ineligible

    matches.push({
      ...job,
      match_score,
      match_explanation,
    })
  }

  // Sort by match score descending
  return matches.sort((a, b) => b.match_score - a.match_score)
}

// =============================================
// DAILY FEED LABELS
// =============================================
export function classifyFeedSections(matches: JobMatch[]): {
  best_matches: JobMatch[]
  new_near_you: JobMatch[]
  high_probability: JobMatch[]
} {
  return {
    best_matches: matches.filter((j) => j.match_score >= 70).slice(0, 20),
    new_near_you: matches.filter((j) => j.match_score >= 50).slice(0, 15),
    high_probability: matches
      .filter((j) => j.hiring_speed_score >= 80 && j.match_score >= 55)
      .slice(0, 15),
  }
}
