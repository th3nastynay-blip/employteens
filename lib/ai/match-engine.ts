/**
 * EMPLOYTEENS — AI Match Engine v2
 * Scores jobs 0-100 using weighted multi-signal scoring.
 *
 * Weights:
 *   Age eligibility    30%  (hard block if under min_age)
 *   Schedule overlap   25%
 *   Location/commute   20%
 *   Interest alignment 15%  (weighted by user-set priority)
 *   Experience match   10%
 */

import type { UserProfile, JobRow, JobMatch } from '@/lib/types/database'
import {
  deserializeTransportation,
  deserializeInterests,
  type Transportation,
  type WeightedInterest,
} from '@/lib/types/onboarding'

// ── Commute range per transport mode (miles) ──────────────────────────
const TRANSPORT_RANGE: Record<Transportation, number> = {
  walking:       1.0,
  bike:          3.0,
  public_transit: 10.0,
  rideshare:     5.0,
  car:           25.0,
  parent_dropoff: 20.0,
}

// ── Interest → job keyword map ────────────────────────────────────────
const INTEREST_KEYWORDS: Record<string, string[]> = {
  'Food & Restaurants':    ['restaurant', 'food', 'pizza', 'chipotle', 'mcdonald', 'starbucks', 'barista', 'crew', 'kitchen', 'cook', 'dunkin', 'panera', 'chick-fil-a', 'burger'],
  'Retail & Shopping':     ['retail', 'store', 'cashier', 'sales associate', 'target', 'walmart', 'mall', 'clothing', 'old navy', 'gap', 'h&m'],
  'Sports & Fitness':      ['gym', 'fitness', 'planet fitness', 'equinox', 'crunch', 'lifeguard', 'pool', 'sport', 'recreation'],
  'Entertainment & Movies':['amc', 'regal', 'theater', 'movie', 'entertainment', 'cinema', 'arcade', 'bowling'],
  'Technology':            ['tech', 'computer', 'software', 'it support', 'help desk', 'developer', 'coding'],
  'Healthcare & Childcare':['childcare', 'babysit', 'camp', 'tutor', 'aide', 'hospital', 'pharmacy', 'cvs', 'walgreens'],
  'Arts & Music':          ['art', 'music', 'design', 'creative', 'photography', 'print', 'craft'],
  'Outdoors & Nature':     ['outdoor', 'landscape', 'park', 'garden', 'nature', 'camp', 'trail'],
  'Customer Service':      ['customer service', 'front desk', 'host', 'receptionist', 'call center', 'support'],
  'Delivery & Logistics':  ['delivery', 'driver', 'logistics', 'package', 'warehouse', 'amazon', 'ups', 'fedex'],
  'Tutoring & Education':  ['tutor', 'teacher', 'camp counselor', 'education', 'learning', 'library', 'school'],
  'Office & Admin':        ['office', 'admin', 'clerk', 'data entry', 'receptionist', 'filing', 'assistant'],
}

// ── Scoring functions ─────────────────────────────────────────────────

function scoreAge(userAge: number | null, job: JobRow): number {
  if (!userAge) return 50
  if (userAge < job.min_age) return 0     // hard block
  return 100
}

function scoreSchedule(user: UserProfile, job: JobRow): number {
  const availability = user.availability as Record<string, boolean>
  let score = job.schedule_flexibility_score

  const hasWeekend = availability?.saturday || availability?.sunday
  if (hasWeekend) score = Math.min(100, score + 10)

  const timeStr = user.school_end_time ?? '3:00 PM'
  const hour = parseInt(timeStr.split(':')[0])
  const isPM = timeStr.includes('PM')
  const hour24 = isPM && hour !== 12 ? hour + 12 : hour

  if (hour24 <= 14) score = Math.min(100, score + 15)  // out early
  if (hour24 >= 17) score = Math.max(0, score - 10)    // out late

  return score
}

function scoreLocation(user: UserProfile, job: JobRow, transports: Transportation[]): number {
  if (user.zip_code === job.zip_code) return 100

  // Estimate distance from ZIP prefix similarity
  const userPfx = user.zip_code.slice(0, 3)
  const jobPfx = job.zip_code.slice(0, 3)
  const samePrefix = userPfx === jobPfx
  const sameState = user.state === job.state

  // Rough estimated miles based on ZIP proximity
  const estimatedMiles = samePrefix ? 2 : sameState ? 6 : 12

  if (transports.length === 0) {
    // No transport info — use job's commute estimate
    return Math.max(0, 100 - job.commute_estimate)
  }

  // Check if ANY transport mode can reach this job
  const maxRange = Math.max(...transports.map((t) => TRANSPORT_RANGE[t] ?? 0))

  if (estimatedMiles <= maxRange * 0.5) return 100
  if (estimatedMiles <= maxRange) return 85
  if (estimatedMiles <= maxRange * 1.5) return 60   // reachable but effort
  return 35
}

function scoreInterests(user: UserProfile, job: JobRow): number {
  const rawInterests = user.interests
  const weighted: WeightedInterest[] = deserializeInterests(rawInterests)

  if (weighted.length === 0) return 60

  const title = job.title.toLowerCase()
  const company = job.company.toLowerCase()

  // Weighted sum: weight × match (1 if matched, 0 if not)
  let totalWeight = 0
  let matchedWeight = 0

  for (const { name, weight } of weighted) {
    totalWeight += weight
    const keywords = INTEREST_KEYWORDS[name] ?? []
    const matched = keywords.some((kw) => title.includes(kw) || company.includes(kw))
    if (matched) matchedWeight += weight
  }

  const ratio = matchedWeight / totalWeight
  return Math.round(50 + ratio * 50)
}

function scoreExperience(user: UserProfile, job: JobRow): number {
  // experience stored in interests/skills — check the experience field
  const exp = (user as UserProfile & { experience?: string }).experience ?? 'none'

  if (job.experience_required === 'none') return 100
  if (job.experience_required === 'preferred') return exp === 'none' ? 75 : 95
  if (job.experience_required === '1_year') {
    if (exp === 'none') return 45
    if (exp === 'some_volunteering') return 65
    return 90
  }
  return 70
}

// ── Structured explanation ────────────────────────────────────────────
export interface MatchReason {
  text: string
  positive: boolean
}

function buildReasons(
  user: UserProfile,
  job: JobRow,
  scores: Record<string, number>,
  transports: Transportation[],
): MatchReason[] {
  const reasons: MatchReason[] = []

  // Schedule
  if (scores.schedule >= 80) {
    reasons.push({ text: `Works with your ${user.school_end_time} school schedule`, positive: true })
  }

  // Age
  if (user.age && user.age >= job.min_age) {
    if (job.min_age <= 15) {
      reasons.push({ text: `Hires at age ${job.min_age} — you qualify`, positive: true })
    } else {
      reasons.push({ text: 'Age requirement met', positive: true })
    }
  }

  // Transport
  if (transports.length > 0 && scores.location >= 80) {
    const primary = transports[0]
    const labels: Record<Transportation, string> = {
      walking: 'walking distance',
      bike: 'bikeable',
      public_transit: 'reachable by transit',
      car: 'easy drive',
      parent_dropoff: 'easy drop-off',
      rideshare: 'short ride',
    }
    reasons.push({ text: `Within ${labels[primary] ?? 'reach'} from you`, positive: true })
  } else if (scores.location < 50) {
    reasons.push({ text: 'Farther than your usual range', positive: false })
  }

  // Experience
  if (job.experience_required === 'none') {
    reasons.push({ text: 'No experience required', positive: true })
  }

  // Hiring speed
  if (job.hiring_speed_score >= 85) {
    reasons.push({ text: 'Known to hire within days', positive: true })
  }

  // Interest match
  if (scores.interest >= 75) {
    const weighted = deserializeInterests(user.interests)
    const title = job.title.toLowerCase()
    const company = job.company.toLowerCase()
    const matched = weighted.find(({ name }) =>
      (INTEREST_KEYWORDS[name] ?? []).some((kw) => title.includes(kw) || company.includes(kw))
    )
    if (matched) {
      reasons.push({ text: `Matches your ${matched.name} interest`, positive: true })
    }
  }

  // Teen friendly
  if (job.teen_friendly_score >= 85) {
    reasons.push({ text: 'Highly teen-friendly employer', positive: true })
  }

  return reasons.slice(0, 5)  // cap at 5 reasons
}

function shortExplanation(reasons: MatchReason[]): string {
  const positives = reasons.filter((r) => r.positive).map((r) => r.text)
  if (positives.length === 0) return 'Possible match based on your location.'
  return positives[0] + (positives[1] ? ` · ${positives[1]}` : '') + '.'
}

// ── Feed section classifier ───────────────────────────────────────────
function determineFeedSection(
  score: number,
  job: JobRow,
  locationScore: number,
): 'best_matches' | 'new_near_you' | 'high_probability' {
  if (score >= 75) return 'best_matches'
  if (locationScore >= 80) return 'new_near_you'
  if (job.hiring_speed_score >= 80) return 'high_probability'
  return 'best_matches'
}

// ── Main match function ───────────────────────────────────────────────
export interface MatchResult {
  match_score: number
  match_explanation: string
  match_reasons: MatchReason[]
  feed_section: 'best_matches' | 'new_near_you' | 'high_probability'
}

export function computeMatchScore(user: UserProfile, job: JobRow): MatchResult {
  // Parse multi-select transportation
  const transports = deserializeTransportation(
    typeof user.transportation === 'string' ? user.transportation : JSON.stringify(user.transportation)
  )

  // Hard block on age
  if (user.age && user.age < job.min_age) {
    return {
      match_score: 0,
      match_explanation: 'Age requirement not met.',
      match_reasons: [{ text: `Requires age ${job.min_age}+`, positive: false }],
      feed_section: 'best_matches',
    }
  }

  const scores = {
    age:      scoreAge(user.age, job),
    schedule: scoreSchedule(user, job),
    location: scoreLocation(user, job, transports),
    interest: scoreInterests(user, job),
    experience: scoreExperience(user, job),
  }

  const weighted =
    scores.age        * 0.30 +
    scores.schedule   * 0.25 +
    scores.location   * 0.20 +
    scores.interest   * 0.15 +
    scores.experience * 0.10

  const match_score = Math.round(Math.min(100, Math.max(0, weighted)))
  const reasons = buildReasons(user, job, scores, transports)

  return {
    match_score,
    match_explanation: shortExplanation(reasons),
    match_reasons: reasons,
    feed_section: determineFeedSection(match_score, job, scores.location),
  }
}

// ── Batch match ───────────────────────────────────────────────────────
export function generateFeedForUser(user: UserProfile, jobs: JobRow[]): JobMatch[] {
  return jobs
    .map((job) => {
      const { match_score, match_explanation } = computeMatchScore(user, job)
      return { ...job, match_score, match_explanation }
    })
    .filter((j) => j.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)
}

export function classifyFeedSections(matches: JobMatch[]) {
  return {
    best_matches:     matches.filter((j) => j.match_score >= 70).slice(0, 20),
    new_near_you:     matches.filter((j) => j.match_score >= 50).slice(0, 15),
    high_probability: matches.filter((j) => j.hiring_speed_score >= 80 && j.match_score >= 55).slice(0, 15),
  }
}

// ── No-match explanation ──────────────────────────────────────────────
export function getNoMatchExplanation(user: UserProfile, section: string): string {
  const weighted = deserializeInterests(user.interests)
  const topInterest = weighted.sort((a, b) => b.weight - a.weight)[0]

  if (section === 'best_matches') {
    if (topInterest) {
      return `There are currently few ${topInterest.name} openings near your ZIP. The jobs shown below match your schedule and transportation much better.`
    }
    return `No perfect matches yet — check back tomorrow as new jobs are added daily.`
  }
  if (section === 'new_near_you') {
    return `No new nearby jobs today. We scan for new listings every 24 hours.`
  }
  return `No fast-hiring employers in your area right now. Check Best Matches for strong overall fits.`
}
