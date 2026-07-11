/**
 * EMPLOYTEENS — AI Match Engine v3
 *
 * Design changes from v2, and why:
 *
 * 1. AGE IS A FILTER, NOT A SCORE. v2 gave age 30% of the weight, but after
 *    the hard under-age block, every remaining job scored 100 on age — a
 *    constant 30 points for everyone, zero differentiation. That weight now
 *    goes to signals that actually separate good matches from mediocre ones.
 *
 * 2. REAL DISTANCES FOR THE LAUNCH MARKET. v2 estimated distance from ZIP
 *    prefix similarity ("same 3-digit prefix ≈ 2 miles"), which is nearly
 *    random inside Hudson County — 073xx covers Jersey City to Kearny.
 *    v3 carries lat/lng centroids for every Hudson County ZIP plus nearby
 *    NYC/Newark, and computes haversine miles. Unknown ZIPs fall back to
 *    the old prefix heuristic.
 *
 * 3. EMPLOYER QUALITY AND HIRING URGENCY ARE SCORED. v2 mentioned them in
 *    reason text but they never moved the number. Trust is the product —
 *    a teen-friendly, fast-hiring employer should outrank a generic one.
 *
 * 4. EVERY SCORE IS EXPLAINABLE. MatchResult now includes score_breakdown
 *    (per-signal 0–100 values plus the weights) so the UI and the AI Coach
 *    can show exactly why a job scored what it scored.
 *
 * Weights (age-eligible jobs only; under-age is a hard block):
 *   Schedule overlap    25%
 *   Location/commute    25%
 *   Interest alignment  15%
 *   Employer quality    15%   (teen-friendliness, scam-risk inverse)
 *   Hiring urgency      10%   (hiring speed, posting recency)
 *   Experience match    10%
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

// ── ZIP centroids: Hudson County launch market + adjacent NYC/Newark ──
// Approximate lat/lng per ZIP. Coverage is deliberately launch-market-deep
// rather than nationwide-shallow; everything else uses the prefix fallback.
const ZIP_CENTROIDS: Record<string, [number, number]> = {
  // Jersey City
  '07302': [40.719, -74.046], '07304': [40.716, -74.072], '07305': [40.697, -74.083],
  '07306': [40.734, -74.071], '07307': [40.750, -74.057], '07310': [40.730, -74.036],
  '07311': [40.719, -74.033],
  // Hoboken / Bayonne / Union City / West New York + Guttenberg
  '07030': [40.745, -74.032], '07002': [40.666, -74.116], '07087': [40.767, -74.032],
  '07093': [40.788, -74.011],
  // North Bergen / Secaucus / Kearny / Weehawken / Harrison + East Newark
  '07047': [40.794, -74.024], '07094': [40.791, -74.061], '07032': [40.768, -74.145],
  '07086': [40.767, -74.020], '07029': [40.743, -74.153],
  // Adjacent markets teens actually commute to
  '07102': [40.735, -74.172], '07103': [40.738, -74.195], '07104': [40.767, -74.169],
  '07105': [40.723, -74.138], // Newark (Ironbound reachable via PATH from Harrison)
  '10001': [40.750, -73.997], '10003': [40.731, -73.989], '10011': [40.742, -74.000],
  '10014': [40.734, -74.006], '10280': [40.708, -74.017], '10282': [40.717, -74.015],
  '11201': [40.694, -73.990],
  // City-central zips assigned by geo.ts zipFromLocation() at ingest —
  // every zip that function can produce must resolve to a centroid here.
  '07201': [40.664, -74.211], // Elizabeth
  '07501': [40.916, -74.172], // Paterson
  '07011': [40.879, -74.140], // Clifton
  '07014': [40.831, -74.135], // Clifton (Route 3 / Clifton Commons)
  '07601': [40.886, -74.045], // Hackensack
  '07024': [40.851, -73.971], // Fort Lee
  '07020': [40.827, -73.974], // Edgewater
  '07652': [40.945, -74.070], // Paramus
  '07109': [40.794, -74.162], // Belleville
  '07003': [40.803, -74.187], // Bloomfield
  '07042': [40.813, -74.212], // Montclair
  '11354': [40.768, -73.827], // Flushing/Queens
  '10451': [40.820, -73.925], // South Bronx
  '10301': [40.631, -74.094], // Staten Island
  '10701': [40.940, -73.880], // Yonkers
}

function haversineMiles(a: [number, number], b: [number, number]): number {
  const R = 3958.8
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Distance in miles between two ZIPs; null when we can't estimate honestly. */
export function zipDistanceMiles(zipA: string, zipB: string): number | null {
  if (!zipA || !zipB) return null
  if (zipA === zipB) return 0.5 // same ZIP ≈ sub-mile
  const a = ZIP_CENTROIDS[zipA]
  const b = ZIP_CENTROIDS[zipB]
  if (a && b) return haversineMiles(a, b)
  return null
}

// ── Interest → job keyword map ────────────────────────────────────────
const INTEREST_KEYWORDS: Record<string, string[]> = {
  'Food & Restaurants':    ['restaurant', 'food', 'pizza', 'chipotle', 'mcdonald', 'starbucks', 'barista', 'crew', 'kitchen', 'cook', 'dunkin', 'panera', 'chick-fil-a', 'burger', 'ice cream'],
  'Retail & Shopping':     ['retail', 'store', 'cashier', 'sales associate', 'target', 'walmart', 'mall', 'clothing', 'old navy', 'gap', 'h&m'],
  'Sports & Fitness':      ['gym', 'fitness', 'planet fitness', 'equinox', 'crunch', 'lifeguard', 'pool', 'sport', 'recreation'],
  'Entertainment & Movies':['amc', 'regal', 'theater', 'theatre', 'movie', 'entertainment', 'cinema', 'arcade', 'bowling'],
  'Technology':            ['tech', 'computer', 'software', 'it support', 'help desk', 'developer', 'coding'],
  'Healthcare & Childcare':['childcare', 'babysit', 'camp', 'tutor', 'aide', 'hospital', 'pharmacy', 'cvs', 'walgreens'],
  'Arts & Music':          ['art', 'music', 'design', 'creative', 'photography', 'print', 'craft'],
  'Outdoors & Nature':     ['outdoor', 'landscape', 'park', 'garden', 'nature', 'camp', 'trail'],
  'Customer Service':      ['customer service', 'front desk', 'host', 'receptionist', 'call center', 'support'],
  'Delivery & Logistics':  ['delivery', 'driver', 'logistics', 'package', 'warehouse', 'amazon', 'ups', 'fedex'],
  'Tutoring & Education':  ['tutor', 'teacher', 'camp counselor', 'education', 'learning', 'library', 'school', 'youth'],
  'Office & Admin':        ['office', 'admin', 'clerk', 'data entry', 'receptionist', 'filing', 'assistant'],
}

// ── Scoring functions (each returns 0–100) ────────────────────────────

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

function scoreLocation(
  user: UserProfile,
  job: JobRow,
  transports: Transportation[],
): { score: number; miles: number | null } {
  const miles = zipDistanceMiles(user.zip_code, job.zip_code)
  const maxRange = transports.length > 0
    ? Math.max(...transports.map((t) => TRANSPORT_RANGE[t] ?? 0))
    : 5 // no transport info — assume a modest default range

  if (miles !== null) {
    if (miles <= maxRange * 0.4) return { score: 100, miles }
    if (miles <= maxRange * 0.75) return { score: 90, miles }
    if (miles <= maxRange) return { score: 78, miles }
    if (miles <= maxRange * 1.5) return { score: 50, miles }
    if (miles <= maxRange * 2.5) return { score: 25, miles }
    return { score: 5, miles } // Syracuse is not "near" Jersey City
  }

  // Unknown distance is now CONSERVATIVE, not optimistic. The old fallback
  // guessed "same state ≈ 6 miles", which floated far-away and no-ZIP jobs
  // ('00000') to the top of local feeds. If we can't verify a job is close,
  // it must not outrank one we know is close.
  const samePrefix = job.zip_code?.length === 5 && job.zip_code !== '00000' &&
    user.zip_code.slice(0, 3) === job.zip_code.slice(0, 3)
  const sameState = user.state === job.state
  if (samePrefix) return { score: 65, miles: null }  // plausibly close, unproven
  if (sameState) return { score: 35, miles: null }
  return { score: 10, miles: null }
}

function scoreInterests(user: UserProfile, job: JobRow): number {
  const weighted: WeightedInterest[] = deserializeInterests(user.interests)
  if (weighted.length === 0) return 60

  const title = job.title.toLowerCase()
  const company = job.company.toLowerCase()

  let totalWeight = 0
  let matchedWeight = 0
  for (const { name, weight } of weighted) {
    totalWeight += weight
    const keywords = INTEREST_KEYWORDS[name] ?? []
    if (keywords.some((kw) => title.includes(kw) || company.includes(kw))) {
      matchedWeight += weight
    }
  }
  return Math.round(50 + (matchedWeight / totalWeight) * 50)
}

function scoreExperience(user: UserProfile, job: JobRow): number {
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

/**
 * Employer quality: teen-friendliness blended with scam-risk inverse.
 * Trust is the product — a verified, teen-friendly employer should outrank
 * an equally-close generic one, and anything with scam signals should sink.
 */
function scoreEmployerQuality(job: JobRow): number {
  const scamInverse = 100 - job.scam_risk_score
  return Math.round(job.teen_friendly_score * 0.7 + scamInverse * 0.3)
}

/** Hiring urgency: employer hiring speed blended with posting recency. */
function scoreUrgency(job: JobRow): number {
  let recency = 40
  if (job.posted_at) {
    const days = (Date.now() - new Date(job.posted_at).getTime()) / 86_400_000
    if (days <= 3) recency = 100
    else if (days <= 7) recency = 80
    else if (days <= 14) recency = 60
  }
  return Math.round(job.hiring_speed_score * 0.7 + recency * 0.3)
}

// ── Structured explanation ────────────────────────────────────────────
export interface MatchReason {
  text: string
  positive: boolean
}

export interface ScoreBreakdown {
  schedule: number
  location: number
  interest: number
  employer_quality: number
  urgency: number
  experience: number
  weights: Record<string, number>
  distance_miles: number | null
}

const WEIGHTS = {
  schedule: 0.25,
  location: 0.25,
  interest: 0.15,
  employer_quality: 0.15,
  urgency: 0.10,
  experience: 0.10,
} as const

function buildReasons(
  user: UserProfile,
  job: JobRow,
  scores: Omit<ScoreBreakdown, 'weights'>,
  transports: Transportation[],
): MatchReason[] {
  const reasons: MatchReason[] = []

  // Distance — the most concrete, trust-building fact we can state
  if (scores.distance_miles !== null && scores.distance_miles <= 3) {
    const d = scores.distance_miles
    reasons.push({
      text: d < 1 ? 'Less than a mile from you' : `About ${d.toFixed(1)} miles from you`,
      positive: true,
    })
  } else if (transports.length > 0 && scores.location >= 80) {
    const labels: Record<Transportation, string> = {
      walking: 'walking distance',
      bike: 'bikeable',
      public_transit: 'reachable by transit',
      car: 'an easy drive',
      parent_dropoff: 'an easy drop-off',
      rideshare: 'a short ride',
    }
    reasons.push({ text: `Within ${labels[transports[0]] ?? 'reach'} from you`, positive: true })
  } else if (scores.location < 50) {
    reasons.push({ text: 'Farther than your usual range', positive: false })
  }

  // Schedule
  if (scores.schedule >= 80) {
    reasons.push({ text: `Works with your ${user.school_end_time ?? 'school'} schedule`, positive: true })
  }

  // Younger-teen eligibility is worth calling out — it's rare and valuable
  if (user.age && job.min_age <= 15 && user.age <= 16) {
    reasons.push({ text: `Hires at age ${job.min_age} — you qualify`, positive: true })
  }

  // Interest match
  if (scores.interest >= 75) {
    const weighted = deserializeInterests(user.interests)
    const title = job.title.toLowerCase()
    const company = job.company.toLowerCase()
    const matched = weighted.find(({ name }) =>
      (INTEREST_KEYWORDS[name] ?? []).some((kw) => title.includes(kw) || company.includes(kw))
    )
    if (matched) reasons.push({ text: `Matches your ${matched.name} interest`, positive: true })
  }

  // Urgency
  if (scores.urgency >= 85) {
    reasons.push({ text: 'Hiring fast — apply soon', positive: true })
  } else if (job.posted_at && (Date.now() - new Date(job.posted_at).getTime()) / 86_400_000 <= 3) {
    reasons.push({ text: 'Posted in the last few days', positive: true })
  }

  // Employer quality
  if (job.teen_friendly_score >= 90) {
    reasons.push({ text: 'Top-rated employer for teens', positive: true })
  } else if (job.teen_friendly_score >= 85) {
    reasons.push({ text: 'Teen-friendly employer', positive: true })
  }

  // Experience
  if (job.experience_required === 'none') {
    reasons.push({ text: 'No experience required', positive: true })
  }

  // Pathway framing for volunteer/program entries
  if (job.job_type === 'volunteer') {
    reasons.push({ text: 'Builds work history for future paid roles', positive: true })
  }
  if (job.job_type === 'seasonal') {
    reasons.push({ text: 'Seasonal — apply within the window', positive: true })
  }

  return reasons.slice(0, 5)
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
  score_breakdown: ScoreBreakdown
  feed_section: 'best_matches' | 'new_near_you' | 'high_probability'
}

export function computeMatchScore(user: UserProfile, job: JobRow): MatchResult {
  const transports = deserializeTransportation(
    typeof user.transportation === 'string' ? user.transportation : JSON.stringify(user.transportation)
  )

  const emptyBreakdown: ScoreBreakdown = {
    schedule: 0, location: 0, interest: 0, employer_quality: 0, urgency: 0,
    experience: 0, weights: { ...WEIGHTS }, distance_miles: null,
  }

  // Hard block on age — a filter, not a scored signal
  if (user.age && user.age < job.min_age) {
    return {
      match_score: 0,
      match_explanation: 'Age requirement not met.',
      match_reasons: [{ text: `Requires age ${job.min_age}+`, positive: false }],
      score_breakdown: emptyBreakdown,
      feed_section: 'best_matches',
    }
  }

  const loc = scoreLocation(user, job, transports)
  const scores = {
    schedule: scoreSchedule(user, job),
    location: loc.score,
    interest: scoreInterests(user, job),
    employer_quality: scoreEmployerQuality(job),
    urgency: scoreUrgency(job),
    experience: scoreExperience(user, job),
    distance_miles: loc.miles,
  }

  const weighted =
    scores.schedule         * WEIGHTS.schedule +
    scores.location         * WEIGHTS.location +
    scores.interest         * WEIGHTS.interest +
    scores.employer_quality * WEIGHTS.employer_quality +
    scores.urgency          * WEIGHTS.urgency +
    scores.experience       * WEIGHTS.experience

  const match_score = Math.round(Math.min(100, Math.max(0, weighted)))
  const reasons = buildReasons(user, job, scores, transports)

  return {
    match_score,
    match_explanation: shortExplanation(reasons),
    match_reasons: reasons,
    score_breakdown: { ...scores, weights: { ...WEIGHTS } },
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
  // Honest messaging for younger teens: supply for 14–15 is structurally
  // thin (most employers and even municipal programs floor at 15–16), so
  // say that instead of a generic "check back tomorrow".
  if (user.age && user.age <= 15 && section === 'best_matches') {
    return `Jobs that hire at ${user.age} are genuinely rare — most employers start at 16. We surface every verified one we find, including library programs and city youth employment (many open each spring). Save your profile and we'll match you the moment one appears.`
  }

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
