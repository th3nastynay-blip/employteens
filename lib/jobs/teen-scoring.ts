/**
 * EMPLOYTEENS — Shared teen-friendliness scoring
 *
 * Consolidated from what used to be two divergent, copy-pasted heuristics
 * (one in the Adzuna route, one in the ATS route). Every ingestion source
 * now scores jobs the same way: a known-company baseline (if we recognize
 * the employer) blended with small text-based signals from the title/description.
 */

export interface TeenScoreProfile {
  teen_friendly_score: number
  hiring_speed_score: number
  min_age: number
}

export interface TeenScoreInput {
  title: string
  company: string
  description?: string
}

export const TEEN_FRIENDLY_COMPANIES: Record<string, TeenScoreProfile> = {
  mcdonald: { teen_friendly_score: 95, hiring_speed_score: 95, min_age: 14 },
  chipotle: { teen_friendly_score: 92, hiring_speed_score: 85, min_age: 16 },
  starbucks: { teen_friendly_score: 90, hiring_speed_score: 70, min_age: 16 },
  target: { teen_friendly_score: 88, hiring_speed_score: 78, min_age: 16 },
  amc: { teen_friendly_score: 95, hiring_speed_score: 80, min_age: 14 },
  regal: { teen_friendly_score: 93, hiring_speed_score: 78, min_age: 14 },
  'five below': { teen_friendly_score: 87, hiring_speed_score: 82, min_age: 16 },
  'shake shack': { teen_friendly_score: 89, hiring_speed_score: 80, min_age: 16 },
  dunkin: { teen_friendly_score: 85, hiring_speed_score: 88, min_age: 16 },
  subway: { teen_friendly_score: 85, hiring_speed_score: 90, min_age: 16 },
  'burger king': { teen_friendly_score: 84, hiring_speed_score: 88, min_age: 16 },
  wendy: { teen_friendly_score: 84, hiring_speed_score: 88, min_age: 16 },
  'planet fitness': { teen_friendly_score: 82, hiring_speed_score: 72, min_age: 16 },
  'chick-fil-a': { teen_friendly_score: 93, hiring_speed_score: 75, min_age: 15 },
  'five guys': { teen_friendly_score: 88, hiring_speed_score: 88, min_age: 16 },
  sweetgreen: { teen_friendly_score: 86, hiring_speed_score: 75, min_age: 16 },
  walgreen: { teen_friendly_score: 82, hiring_speed_score: 73, min_age: 16 },
  cvs: { teen_friendly_score: 83, hiring_speed_score: 74, min_age: 16 },
}

const DEFAULT_PROFILE: TeenScoreProfile = { teen_friendly_score: 72, hiring_speed_score: 70, min_age: 16 }

export function getCompanyProfile(company: string): TeenScoreProfile {
  const lower = company.toLowerCase()
  for (const [key, val] of Object.entries(TEEN_FRIENDLY_COMPANIES)) {
    if (lower.includes(key)) return val
  }
  return DEFAULT_PROFILE
}

export function scoreTeenFriendliness(input: TeenScoreInput): number {
  const profile = getCompanyProfile(input.company)
  let score = profile.teen_friendly_score
  const text = `${input.title} ${input.description ?? ''}`.toLowerCase()

  if (text.includes('part') && text.includes('time')) score += 3
  if (text.includes('flexible')) score += 3
  if (text.includes('student') || text.includes('high school')) score += 5
  if (text.includes('no experience') || text.includes('entry level') || text.includes('entry-level')) score += 3

  return Math.min(100, score)
}

/**
 * Keyword/URL-based scam scoring, ported from the old workers/job-enricher.ts
 * (deleted — that whole standalone worker pipeline bypassed URL verification
 * entirely and is superseded by lib/jobs/ingest-pipeline.ts). The dashboard and
 * generate-feed routes both filter on `scam_risk_score < 70`, so this needs to
 * actually run per job, not default to a hardcoded 0 — a scam filter that
 * always returns "safe" is worse than no filter, since it looks like protection
 * without providing any.
 */
export interface ScamScoreInput {
  title: string
  company: string
  description?: string
  apply_url: string
}

export function detectScamRisk(job: ScamScoreInput): number {
  let score = 0
  const text = `${job.title} ${job.company} ${job.description ?? ''} ${job.apply_url}`.toLowerCase()

  if (text.includes('make money fast')) score += 40
  if (text.includes('work from home earn')) score += 30
  if (text.includes('no experience earn $')) score += 25
  if (text.includes('$500/day') || text.includes('$1000/day')) score += 50
  if (text.includes('mlm') || text.includes('network marketing')) score += 60
  if (text.includes('commission only')) score += 20
  if (text.includes('send money')) score += 80
  if (text.includes('wire transfer')) score += 80
  if (text.includes('gift card')) score += 70

  const url = job.apply_url.toLowerCase()
  if (!url.startsWith('https')) score += 20
  if (url.includes('bit.ly') || url.includes('tinyurl')) score += 30
  if (url.includes('craigslist')) score += 25

  // Legitimate ATS domains reduce risk
  const knownDomains = ['greenhouse.io', 'lever.co', 'workday.com', 'taleo.net', 'icims.com', 'ashbyhq.com', 'smartrecruiters.com']
  if (knownDomains.some((d) => url.includes(d))) score = Math.max(0, score - 30)

  const company = job.company.toLowerCase()
  if (Object.keys(TEEN_FRIENDLY_COMPANIES).some((c) => company.includes(c))) score = 0

  return Math.min(100, Math.max(0, score))
}
