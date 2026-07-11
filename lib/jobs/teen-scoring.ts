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
  // Franchise-dependent: some US McDonald's hire at 14, but NJ locations are
  // predominantly 16+. Conservative floor — a 14-year-old must never be sent
  // to apply somewhere that won't take them.
  mcdonald: { teen_friendly_score: 95, hiring_speed_score: 95, min_age: 16 },
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
  // NJ CFA franchises state 16+ on their own postings (Newport Centre
  // confirmed 2026-07-10); 15 is common elsewhere but not verifiable here.
  'chick-fil-a': { teen_friendly_score: 93, hiring_speed_score: 75, min_age: 16 },
  'five guys': { teen_friendly_score: 88, hiring_speed_score: 88, min_age: 16 },
  sweetgreen: { teen_friendly_score: 86, hiring_speed_score: 75, min_age: 16 },
  walgreen: { teen_friendly_score: 82, hiring_speed_score: 73, min_age: 16 },
  cvs: { teen_friendly_score: 83, hiring_speed_score: 74, min_age: 16 },
  wegmans: { teen_friendly_score: 92, hiring_speed_score: 72, min_age: 15 },
  'insomnia cookies': { teen_friendly_score: 88, hiring_speed_score: 80, min_age: 16 },
  // Hudson County municipal / program employers (curated local sources).
  // Youth employment programs are literally designed for teens — max
  // friendliness. Also matters for detectScamRisk: a recognized employer
  // zeroes the scam score (hcstonline.org is http://, which would otherwise
  // score +20 for no-https on a government-run program).
  'city of jersey city': { teen_friendly_score: 98, hiring_speed_score: 75, min_age: 15 },
  'jersey city free public library': { teen_friendly_score: 96, hiring_speed_score: 60, min_age: 14 },
  'city of bayonne': { teen_friendly_score: 96, hiring_speed_score: 78, min_age: 15 },
  'town of secaucus': { teen_friendly_score: 96, hiring_speed_score: 78, min_age: 15 },
  'town of west new york': { teen_friendly_score: 96, hiring_speed_score: 78, min_age: 15 },
  'hcst community resource center': { teen_friendly_score: 92, hiring_speed_score: 70, min_age: 16 },
}

const DEFAULT_PROFILE: TeenScoreProfile = { teen_friendly_score: 72, hiring_speed_score: 70, min_age: 16 }

export function getCompanyProfile(company: string): TeenScoreProfile {
  const lower = company.toLowerCase()
  for (const [key, val] of Object.entries(TEEN_FRIENDLY_COMPANIES)) {
    if (lower.includes(key)) return val
  }
  return DEFAULT_PROFILE
}

// Role types federal law and most employers actually allow at 14-15, even
// when the specific employer isn't a recognized brand name. Added after
// discovering min_age was being assigned purely by company-name matching,
// which misses franchise locations posted under a franchisee's LLC name
// (e.g. "ABC Foods LLC dba McDonald's") instead of the brand itself — those
// would otherwise silently default to 16 and disappear for younger teens.
const YOUNG_TEEN_TITLE_PATTERNS: RegExp[] = [
  /usher/i,
  /concession/i,
  /\bbagger\b/i,
  /grocery bagg/i,
  /ice cream/i,
  /\bscooper\b/i,
  /amusement/i,
  /recreation attendant/i,
  /movie theater/i,
  /theater attendant/i,
]

/**
 * Resolves min_age using company match first (trusted — could be higher OR
 * lower than the 16 default), falling back to title-based role recognition
 * when the company is unrecognized, before finally falling back to the
 * conservative 16 default.
 */
export function resolveMinAge(title: string, company: string): number {
  const lower = company.toLowerCase()
  const companyMatch = Object.entries(TEEN_FRIENDLY_COMPANIES).find(([key]) => lower.includes(key))
  if (companyMatch) return companyMatch[1].min_age

  if (YOUNG_TEEN_TITLE_PATTERNS.some((p) => p.test(title))) return 14

  return DEFAULT_PROFILE.min_age
}

/**
 * Roles a 14–19 year old cannot realistically hold (or legally, for
 * age-restricted work like bartending/security). Discovered live: Lever
 * ingestion had "Vice President, Product" and "Director, Global Account
 * Strategy" visible on a TEEN job board — the quality score measured
 * application legitimacy, not whether a teenager could ever get (or want)
 * the job. This gate runs before verification at ingest and during audit.
 */
const ADULT_ROLE_PATTERNS: RegExp[] = [
  /\b(vice president|vp|president|chief|c[eftio]o|founder)\b/i,
  /\bdirector\b/i,
  /\bhead of\b/i,
  /\b(senior|sr\.?|principal|staff|executive)\b/i,
  /\bmanager\b/i,                    // shift LEADER stays allowed; manager roles are 18+
  /\b(engineer|developer|architect|scientist|analyst|consultant)\b/i,
  /\b(attorney|counsel|paralegal|accountant|controller|actuary|underwriter)\b/i,
  /\b(nurse|physician|doctor|dentist|therapist|pharmacist|veterinar)\b/i,
  /\b(electrician|plumber|hvac|welder|machinist|cdl|forklift)\b/i,
  /\b(bartender|sommelier|mixologist)\b/i,   // 18+/21+ to serve alcohol in NJ/NY
  /\b(security guard|armed|bouncer)\b/i,     // 18+
  /\b\d+\+?\s*(years|yrs)\b/i,               // "5+ years" in a title
]

export function isTeenAppropriateTitle(title: string): boolean {
  return !ADULT_ROLE_PATTERNS.some((p) => p.test(title))
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
  // Referral-scheme "jobs": the work is recruiting more teens into the same
  // program (seen live: CampusReel's per-city "14 & 15 year olds needed"
  // SEO listings, June 2026). The site is the "employer," so the
  // default-deny destination check can't catch it — the text pattern can.
  if (/recruit (fellow|other) (students|friends|teens)/.test(text)) score += 50
  if (text.includes('ambassador program') && /recruit/.test(text)) score += 30
  if (/\bambassador\b/.test(text) && /social media promotion|word.of.mouth/.test(text)) score += 25
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
