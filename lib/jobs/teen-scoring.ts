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

/** Oldest user the platform serves. Anything above this can never be shown. */
export const MAX_TEEN_AGE = 19

/**
 * Explicit age statements in the posting text.
 *
 * THE BUG THIS FIXES: resolveMinAge previously read only the title and the
 * company name, and could never return anything above 16. A posting from an
 * unrecognized employer whose description said "Must be 18 years of age or
 * older" was stamped min_age 16, shown to 16-year-olds, and sent them to an
 * application they were legally ineligible for. That is the single worst
 * failure mode this product has: it costs a teen an afternoon and costs the
 * platform the trust it is built on.
 *
 * The employer's own stated age beats every heuristic we have, in BOTH
 * directions — a franchise posting that says "must be 15" unlocks 15-year-olds
 * even though the brand default is 16.
 *
 * Range-guarded to 14–21 so "must be 100% available" and "must be 25 lbs"
 * style text can't be read as an age.
 */
const STATED_AGE_PATTERNS: RegExp[] = [
  /\bmust be (?:at least |a minimum of )?(\d{2})\b(?!\s*(?:%|lbs?|pounds|hours|hrs|minutes|mins|miles))/gi,
  /\b(?:minimum|min\.?)\s*age\b[^.\d]{0,15}(\d{2})\b/gi,
  /\bat least (\d{2})\s*(?:years?|yrs?)\b/gi,
  /\b(\d{2})\s*(?:years?|yrs?)(?:\s*of age)?\s*(?:or older|and older|and up|\+)/gi,
  /\b(\d{2})\+\s*(?:years? old|to apply|only|required)/gi,
  /\bage\s*(?:requirement|minimum)?\s*[:=]\s*(\d{2})\b/gi,
  /\b(?:applicants?|candidates?|you) must be (\d{2})\b/gi,
  /\b(?:we )?hir(?:e|ing)\s+(?:at|from|starting at)\s+(?:age\s+)?(\d{2})\b/gi,
  /\bages?\s+(\d{2})\s*(?:and up|\+|and older|and above)/gi,
]

export function statedMinAge(text: string): number | null {
  if (!text) return null
  let found: number | null = null
  for (const rx of STATED_AGE_PATTERNS) {
    rx.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = rx.exec(text)) !== null) {
      const age = Number(m[1])
      // Outside 14–21 it is not an age requirement, it is a number that
      // happened to sit next to the word "must".
      if (age >= 14 && age <= 21) found = Math.max(found ?? 0, age)
    }
  }
  return found
}

/**
 * Hard legal/practical floors that apply regardless of what the employer or
 * our company table says. Previously this logic existed ONLY inside
 * workday-ingest.ts, so the same overnight-stocker or delivery-driver role
 * arriving via JSearch, Adzuna, Greenhouse, Lever, or SmartRecruiters got no
 * floor at all. These are description-aware, unlike ADULT_ROLE_PATTERNS which
 * reads the title only.
 */
const ADULT_FLOOR_RULES: Array<{ rx: RegExp; age: number; why: string }> = [
  // NJ/NY: serving or selling alcohol
  { rx: /\b(serve|serving|sell(ing)?|pour(ing)?)\s+(alcohol|liquor|beer|wine)\b|\bbartend/i, age: 18, why: 'alcohol service' },
  // Driving for the job. NJ probationary licenses can't be used commercially.
  { rx: /\b(valid |current )?driver'?s?\s+licen[sc]e\b|\bdelivery driver\b|\bown (a |your own )?(car|vehicle)\b|\breliable transportation required\b/i, age: 18, why: 'driving required' },
  // FLSA hazardous occupations orders (HO 5, 10, 12) — power-driven equipment
  { rx: /\b(forklift|pallet jack|power[- ]driven|meat slicer|deep fryer operation|baler|compactor|band saw|box crusher)\b/i, age: 18, why: 'power-driven equipment' },
  // Night work bans for minors under NJ child labor law
  { rx: /\b(overnight|third shift|3rd shift|graveyard|11\s*pm|midnight shift)\b/i, age: 18, why: 'overnight shift' },
  { rx: /\b(security guard|unarmed guard|armed|bouncer|door (staff|person))\b/i, age: 18, why: 'security work' },
  { rx: /\b(work(ing)? papers not|no working papers|18\+ only|adults only)\b/i, age: 18, why: 'explicitly adult-only' },
]

export function adultAgeFloor(text: string): { age: number; why: string } | null {
  for (const rule of ADULT_FLOOR_RULES) {
    if (rule.rx.test(text)) return { age: rule.age, why: rule.why }
  }
  return null
}

export interface MinAgeResult {
  min_age: number
  /** Why we landed here — logged at ingest so bad calls are debuggable. */
  reason: string
  /** True when the employer stated an age themselves (highest confidence). */
  explicit: boolean
}

/**
 * Resolve the minimum age for a posting.
 *
 * Precedence, strongest first:
 *   1. an age the employer stated in the posting text (either direction)
 *   2. a declared age from a trusted ingest source (curated / tenant config)
 *   3. our company table
 *   4. young-teen role recognition from the title
 *   5. the conservative 16 default
 * then a hard floor from ADULT_FLOOR_RULES is applied over the result, because
 * no employer policy overrides child labor law.
 */
export function resolveMinAgeDetailed(
  title: string,
  company: string,
  description?: string | null,
  declared?: number | null,
): MinAgeResult {
  const text = `${title} ${description ?? ''}`

  let min_age: number
  let reason: string
  let explicit = false

  const stated = statedMinAge(text)
  if (stated !== null) {
    min_age = stated
    reason = `posting states ${stated}+`
    explicit = true
  } else if (typeof declared === 'number') {
    min_age = declared
    reason = 'declared by source'
  } else {
    const lower = company.toLowerCase()
    const companyMatch = Object.entries(TEEN_FRIENDLY_COMPANIES).find(([key]) => lower.includes(key))
    if (companyMatch) {
      min_age = companyMatch[1].min_age
      reason = `company default (${companyMatch[0]})`
    } else if (YOUNG_TEEN_TITLE_PATTERNS.some((p) => p.test(title))) {
      min_age = 14
      reason = 'young-teen role title'
    } else {
      min_age = DEFAULT_PROFILE.min_age
      reason = 'conservative default'
    }
  }

  const floor = adultAgeFloor(text)
  if (floor && floor.age > min_age) {
    return { min_age: floor.age, reason: `${reason}, raised to ${floor.age} (${floor.why})`, explicit }
  }

  return { min_age, reason, explicit }
}

/** Back-compat wrapper. Prefer resolveMinAgeDetailed — it explains itself. */
export function resolveMinAge(
  title: string,
  company: string,
  description?: string | null,
  declared?: number | null,
): number {
  return resolveMinAgeDetailed(title, company, description, declared).min_age
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

/**
 * Job families a teenager plausibly holds. Title-driven, same shape as
 * PERMITTED_AT_14 in child-labor.ts and for the same reason: descriptions
 * mention adjacent work constantly, so matching on them lets unrelated roles
 * through.
 *
 * WHY THIS EXISTS. ADULT_ROLE_PATTERNS above is a blocklist, and a blocklist
 * silently passes everything it has never seen. On the v6 audit that meant
 * "AIU Psychologist", "Associate Fire Protection Inspector II" and "Renew Crew
 * APSW – Heavy Duty" — all City of New York municipal postings — sailed
 * through isTeenAppropriateTitle and stayed live on a board for
 * 14-to-19-year-olds. No blocklist is ever finished; every new employer brings
 * new titles.
 *
 * So the verdict is three-valued. Unrecognised is its own answer, and it is
 * not the same answer as "fine".
 */
const TEEN_ROLE_PATTERNS: RegExp[] = [
  // Retail and general front-line.
  // "crew" must carry a noun. Bare \bcrew\b matched "Renew Crew APSW – Heavy
  // Duty", a NYC sanitation posting, and waved it straight through.
  /\b(crew member|crew associate|team member|sales associate|retail associate|store associate|sales assistant|cashier|bagger|courtesy clerk|greeter|stocker|stock associate|merchandiser|fitting room)\b/i,
  // Driving is 18+ under REQUIRES_DRIVING, but 18 and 19 year olds are on the
  // platform, so these are real listings — recognised, then age-gated.
  /\b(delivery (driver|associate)|driver|courier|bike (courier|delivery))\b/i,
  // Food service
  /\b(barista|server|waiter|waitress|host|hostess|busser|dishwasher|line cook|prep cook|cook|food runner|expeditor|sandwich (artist|maker)|pizza maker|scooper|cake decorator)\b/i,
  // Warehouse and stockroom, non-hazardous
  /\b(warehouse associate|package handler|order (picker|selector)|fulfillment associate|inventory associate|shopper|picker|packer)\b/i,
  // Recreation, camp, sport
  /\b(lifeguard|camp counsellor|camp counselor|swim instructor|referee|umpire|ride operator|park attendant|caddie|ski instructor)\b/i,
  // Clerical and library
  /\b(office assistant|clerical assistant|file clerk|data entry|receptionist|front desk|library (page|aide|assistant)|office aide|mail ?room)\b/i,
  // Tutoring, childcare, animals
  /\b(tutor|teaching assistant|classroom aide|babysitter|childcare (aide|assistant)|kennel (assistant|attendant)|dog walker|pet care)\b/i,
  // Service and cleaning
  /\b(car wash|detailer|custodian|janitorial|housekeep|room attendant|porter|valet|usher|ticket (taker|seller)|concession|attendant)\b/i,
  // Seasonal and outdoor
  /\b(landscaping (helper|assistant)|grounds ?keep|snow removal|farm ?hand|harvest|nursery worker|garden cent(er|re))\b/i,
  // Junior by construction
  /\b(intern|internship|apprentice|trainee|junior|entry.level|seasonal|summer (associate|help|staff)|student (worker|associate)|shift (lead|leader))\b/i,
]

export type TeenTitleVerdict = 'allow' | 'block' | 'unknown'

/**
 * Three-valued so callers can tell "we checked and it is fine" apart from
 * "we have never seen this kind of work". Publishing an unknown at face value
 * asserts knowledge we do not have.
 */
export function teenTitleVerdict(title: string): TeenTitleVerdict {
  if (ADULT_ROLE_PATTERNS.some((p) => p.test(title))) return 'block'
  if (TEEN_ROLE_PATTERNS.some((p) => p.test(title))) return 'allow'
  return 'unknown'
}

/**
 * Kept for existing callers, and deliberately still permissive: it answers
 * "is this definitely NOT a teen job", so 'unknown' passes. Callers that care
 * about the difference should use teenTitleVerdict.
 */
export function isTeenAppropriateTitle(title: string): boolean {
  return teenTitleVerdict(title) !== 'block'
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
