/**
 * EMPLOYTEENS — Child labor compliance rules (NJ + NY)
 *
 * WHY THIS EXISTS
 *
 * min_age used to be a single number that conflated two completely different
 * facts: what the LAW allows for an occupation, and what a specific EMPLOYER
 * is willing to do. Merging them caused errors in both directions.
 *
 *   Too strict: `resolveMinAge` defaulted every unrecognized employer to 16.
 *   But NJ explicitly permits 14-year-olds in restaurants, supermarkets,
 *   retail, hotels, hospitals, libraries, camps and amusement work. A family
 *   pizzeria that would legally hire a 14-year-old was stamped 16 and hidden
 *   from exactly the users we cannot otherwise serve.
 *
 *   Too loose: nothing read the description for hours or occupation
 *   restrictions, so a posting advertising shifts until 11pm could surface to
 *   a 15-year-old who legally cannot work past 7pm during the school year.
 *
 * So: `legal_min_age` (this module) and `employer_min_age` (stated policy /
 * phone verification) are separate fields. Display uses the higher of the two.
 * A job with legal_min_age 14 and an unknown employer policy is a
 * call-to-verify candidate, not a hidden listing.
 *
 * PRECEDENCE: where federal FLSA hazardous occupation orders are stricter
 * than state law, federal governs. Where state is stricter, state governs.
 * These tables encode the stricter of the two.
 *
 * NOT LEGAL ADVICE. These are engineering rules derived from published state
 * guidance, current as of 2026-08-10. Have counsel review before relying on
 * them for anything beyond ranking and display.
 *
 * Sources:
 *   NJ DOL, "Young Workers in NJ: Rights and Protections for Workers under 18"
 *     https://www.nj.gov/labor/myworkrights/worker-protections/workers_under_18/
 *   NY DOL LS-171, "Summary of NYS Child Labor Law, Permitted Working Hours"
 *     https://dol.ny.gov/summary-new-york-state-child-labor-law-permitted-working-hours-minors-under-18-years-age-ls171
 *   NY DOL, "State Prohibited Occupations for Minors"
 *     https://dol.ny.gov/state-prohibited-occupations-minors
 */

import { statedMinAge, getCompanyProfile, TEEN_FRIENDLY_COMPANIES } from './teen-scoring'

export type StateCode = 'NJ' | 'NY'

export interface LegalAgeResult {
  /** Youngest age the LAW permits for this occupation. Not employer policy. */
  legal_min_age: number
  /** Human-readable justification, logged at ingest so bad calls are debuggable. */
  reason: string
  /** True when a specific rule matched rather than falling through to default. */
  matched: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Occupations NJ explicitly permits at 14
//
// This is a WHITELIST and it is the single most valuable table here, because
// it is the only thing that can legitimately pull a listing below 16. NJ DOL
// publishes it verbatim; these patterns track that list.
// ─────────────────────────────────────────────────────────────────────────────

const PERMITTED_AT_14: Array<{ rx: RegExp; label: string }> = [
  { rx: /\b(restaurant|food service|fast food|counter (person|attendant|help)|host(ess)?|busser|bus (person|boy|girl)|dishwasher|server|waitstaff|barista|crew member|team member)\b/i, label: 'restaurant work' },
  { rx: /\b(soda fountain|ice cream|scooper|creamery|juice bar|smoothie)\b/i, label: 'soda fountain' },
  { rx: /\b(supermarket|grocery|food store|bagger|cart attendant|courtesy clerk|stock clerk|shelf stock)\b/i, label: 'supermarket and food store' },
  { rx: /\b(mercantile|retail|sales associate|sales person|salesperson|cashier|store associate|shop assistant)\b/i, label: 'mercantile store and retail sales' },
  { rx: /\b(hotel|motel|front desk|bell (hop|staff)|housekeep)\b/i, label: 'hotel work' },
  { rx: /\b(clerical|office assistant|receptionist|file clerk|data entry|administrative assistant)\b/i, label: 'clerical and office work' },
  { rx: /\b(amusement|arcade|theme park|water park|carnival|fun ?center|bowling|movie theat(er|re)|cinema|usher|concession|ticket taker|box office)\b/i, label: 'amusement industry' },
  { rx: /\b(hospital|health agency|clinic|patient transport|volunteer services)\b/i, label: 'hospital and health agency' },
  { rx: /\blibrar(y|ian) (attendant|assistant|aide|page)\b|\blibrary page\b/i, label: 'library attendant' },
  { rx: /\b(camp counselor|counselor at camp|junior counselor|beach attendant|lifeguard|caddie|caddy|pinsetter)\b/i, label: 'camp, beach, lifeguard, caddie' },
  { rx: /\b(babysitt|baby sitt|child ?care aide|mother'?s helper|nanny|pet sitt|dog walk)\b/i, label: 'domestic help' },
  { rx: /\b(janitor|cleaner|custodial aide|maid|housekeeper)\b/i, label: 'domestic and cleaning' },
  { rx: /\b(tutor|peer tutor|teaching assistant|reading buddy)\b/i, label: 'professional assistant' },
  { rx: /\b(delivery)\b(?!.*\b(driver|vehicle|van|truck|car)\b)/i, label: 'non-motor-vehicle delivery' },
  { rx: /\b(newspaper|magazine) (carrier|delivery|route)\b/i, label: 'newspaper and magazine delivery' },
  { rx: /\b(model|singer|dancer|entertainer|actor|actress|theatrical)\b/i, label: 'performance work' },
]

// ─────────────────────────────────────────────────────────────────────────────
// 2. Hard blocks — prohibited for ALL minors under 18 in NJ and/or NY
//
// A match here means the listing cannot be shown to any EmployTeens user.
// ─────────────────────────────────────────────────────────────────────────────

export const PROHIBITED_UNDER_18: Array<{ rx: RegExp; why: string }> = [
  // Establishments where alcohol is sold for on-premises consumption (NJ + NY)
  { rx: /\b(bar ?tender|bartending|mixologist|sommelier|cocktail (server|waitress)|night ?club|brewery tap ?room|distiller|liquor store)\b/i, why: 'alcohol establishment' },
  { rx: /\b(pool hall|billiard)\b/i, why: 'pool and billiard room' },
  { rx: /\b(junk ?yard|scrap (metal )?yard|salvage yard)\b/i, why: 'junk and scrap yard' },
  // "Construction Laborer" must match. An earlier version required a word
  // boundary right after "labor" and silently fell through to the 16 default.
  { rx: /\bconstruction\s+(work(er)?|site|labor(er)?|crew|help(er)?)\b|\b(demolition|roofing|scaffold|excavat)/i, why: 'construction and demolition' },
  { rx: /\b(mining|quarry|smelter|foundry|forging|blast furnace|hot rolling)\b/i, why: 'mining, smelting, forging' },
  { rx: /\b(slaughter|meat ?pack|rendering plant|poultry process)\b/i, why: 'slaughtering and meat packing' },
  { rx: /\b(logging|timber fell|sawmill)\b/i, why: 'logging and sawmilling' },
  { rx: /\b(explosive|ammunition|pyrotechnic|fireworks manufactur)\b/i, why: 'explosives' },
  { rx: /\b(asbestos|radioactive|ionizing radiation|carcinogen|pesticide applicat)\b/i, why: 'toxic or radioactive exposure' },
  // FLSA hazardous orders that are stricter than either state
  { rx: /\bforklift|power[- ]?driven hoist|elevator (operator|repair)|man ?lift\b/i, why: 'power-driven hoisting apparatus (FLSA HO 7)' },
  { rx: /\b(meat slicer|meat grind|band ?saw|circular saw|guillotine shear|paper baler|box compactor|trash compactor)\b/i, why: 'prohibited power-driven machinery' },
  { rx: /\b(roofer|wrecking|shipbreaking)\b/i, why: 'prohibited trade' },
]

// ─────────────────────────────────────────────────────────────────────────────
// 3. Restricted to 16+
//
// NJ permits these at 16 (power tools, mowers, tractors, general machinery).
// A previous version floored them at 18, which was too strict and hid
// legitimate 16-year-old work.
// ─────────────────────────────────────────────────────────────────────────────

const RESTRICTED_TO_16: Array<{ rx: RegExp; why: string }> = [
  { rx: /\b(power (tool|equipment|washer)|power[- ]?driven|machine operator|machinery operator)\b/i, why: 'power-driven equipment (16+ in NJ)' },
  { rx: /\b(lawn ?mower|landscap(ing|er)|groundskeep|snow ?blow)\b/i, why: 'power lawn equipment (16+ in NJ)' },
  { rx: /\b(tractor|skid ?steer)\b/i, why: 'tractor operation (16+ in NJ)' },
  { rx: /\b(mechanic|auto ?body|tire tech|lube tech)\b/i, why: 'mechanic work (16+ in NJ)' },
  { rx: /\b(warehouse|fulfillment cent|distribution cent|stockroom pick)\b/i, why: 'warehouse work' },
  // NY bars under-16 from factory work entirely, with narrow service-store exceptions
  { rx: /\b(factory|manufactur(ing|er)|assembly line|production line|plant operat)\b/i, why: 'factory work (barred under 16 in NY)' },
  { rx: /\b(deli (counter|clerk|associate)|butcher counter)\b/i, why: 'deli slicing equipment' },
]

// Driving for the job. NJ probationary licenses cannot be used commercially,
// and a 16-year-old cannot hold a full NJ license.
const REQUIRES_DRIVING = /\b(valid |current )?driver'?s?\s+licen[sc]e\b|\bdelivery driver\b|\bown (a |your own )?(car|vehicle)\b|\bmust have (reliable )?transportation\b|\bcdl\b/i

// ─────────────────────────────────────────────────────────────────────────────
// 4. Permitted hours, by state and age band
//
// NY is materially stricter than NJ for 16 and 17 year olds during the school
// year: 28 hours a week and 4 hours on a school night, versus NJ's 40 and 8.
// A job posting that advertises hours outside these windows is not legal for
// that age band, which makes it auditable from the listing text.
// ─────────────────────────────────────────────────────────────────────────────

export interface HourRule {
  maxWeekHours: number
  maxSchoolDayHours: number
  maxNonSchoolDayHours: number
  earliestHour: number   // 24h clock
  latestHour: number     // 24h clock; 24 means midnight
  maxConsecutiveDays: number
}

export interface StateHourRules {
  schoolWeek: HourRule
  vacation: HourRule
}

export const HOURS_RULES: Record<StateCode, Record<'14_15' | '16_17', StateHourRules>> = {
  NJ: {
    '14_15': {
      schoolWeek: { maxWeekHours: 18, maxSchoolDayHours: 3, maxNonSchoolDayHours: 8, earliestHour: 7, latestHour: 19, maxConsecutiveDays: 6 },
      vacation:   { maxWeekHours: 40, maxSchoolDayHours: 8, maxNonSchoolDayHours: 8, earliestHour: 7, latestHour: 21, maxConsecutiveDays: 6 },
    },
    '16_17': {
      schoolWeek: { maxWeekHours: 40, maxSchoolDayHours: 8, maxNonSchoolDayHours: 8, earliestHour: 6, latestHour: 23, maxConsecutiveDays: 6 },
      vacation:   { maxWeekHours: 50, maxSchoolDayHours: 10, maxNonSchoolDayHours: 10, earliestHour: 6, latestHour: 23, maxConsecutiveDays: 6 },
    },
  },
  NY: {
    '14_15': {
      schoolWeek: { maxWeekHours: 18, maxSchoolDayHours: 3, maxNonSchoolDayHours: 8, earliestHour: 7, latestHour: 19, maxConsecutiveDays: 6 },
      vacation:   { maxWeekHours: 40, maxSchoolDayHours: 8, maxNonSchoolDayHours: 8, earliestHour: 7, latestHour: 21, maxConsecutiveDays: 6 },
    },
    '16_17': {
      // 28 hours a week, 4 on a day preceding a school day. Much tighter than NJ.
      // 10pm can extend to midnight only with written parental AND school consent,
      // so we hold the line at 22 for display purposes.
      schoolWeek: { maxWeekHours: 28, maxSchoolDayHours: 4, maxNonSchoolDayHours: 8, earliestHour: 6, latestHour: 22, maxConsecutiveDays: 6 },
      vacation:   { maxWeekHours: 48, maxSchoolDayHours: 8, maxNonSchoolDayHours: 8, earliestHour: 6, latestHour: 24, maxConsecutiveDays: 6 },
    },
  },
}

/** All minors in both states: 30-minute meal break after 6 continuous hours. */
export const MEAL_BREAK_AFTER_HOURS = 6

// ─────────────────────────────────────────────────────────────────────────────
// 5. Resolvers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The youngest age the LAW permits for this occupation, ignoring employer
 * policy entirely. Order matters: hard blocks first, then 16+ restrictions,
 * then the 14 whitelist, then a conservative default.
 */
export function resolveLegalMinAge(
  title: string,
  description?: string | null,
  state: StateCode = 'NJ',
): LegalAgeResult {
  const text = `${title} ${description ?? ''}`

  for (const rule of PROHIBITED_UNDER_18) {
    if (rule.rx.test(text)) {
      return { legal_min_age: 18, reason: `prohibited for minors: ${rule.why}`, matched: true }
    }
  }

  if (REQUIRES_DRIVING.test(text)) {
    return { legal_min_age: 18, reason: 'requires driving on the job', matched: true }
  }

  for (const rule of RESTRICTED_TO_16) {
    if (rule.rx.test(text)) {
      return { legal_min_age: 16, reason: rule.why, matched: true }
    }
  }

  // Only the title drives the 14 whitelist. Descriptions mention adjacent
  // work constantly ("support our restaurant partners") and matching on that
  // would let unrelated roles fall through to 14.
  for (const rule of PERMITTED_AT_14) {
    if (rule.rx.test(title)) {
      // NY bars under-16 from factory work but otherwise tracks the same
      // service-sector permissions, so the whitelist applies in both states.
      return { legal_min_age: 14, reason: `${state} permits at 14: ${rule.label}`, matched: true }
    }
  }

  return { legal_min_age: 16, reason: 'no occupation rule matched, conservative default', matched: false }
}

export interface HoursConflict {
  band: '14_15' | '16_17'
  detail: string
}

/**
 * Read scheduling language out of a posting and work out which age bands it
 * excludes. A listing advertising shifts until 11pm is legal for a 16-year-old
 * in NJ and illegal for a 15-year-old year-round.
 *
 * Deliberately conservative: only fires on explicit, unambiguous phrasing.
 * A false "this excludes 14-year-olds" costs a teen a real job, so silence is
 * preferred over a guess.
 */
export function detectHoursConflicts(
  text: string,
  state: StateCode = 'NJ',
  schoolInSession = true,
): { impliedMinAge: number | null; conflicts: HoursConflict[] } {
  const conflicts: HoursConflict[] = []
  if (!text) return { impliedMinAge: null, conflicts }

  const season = schoolInSession ? 'schoolWeek' : 'vacation'
  const latest1415 = HOURS_RULES[state]['14_15'][season].latestHour
  const latest1617 = HOURS_RULES[state]['16_17'][season].latestHour

  // Latest end time mentioned, e.g. "until 11pm", "shifts to 10:30 PM", "close at 9pm"
  let latestMentioned: number | null = null
  const timeRx = /\b(?:until|til|till|to|through|closing at|close at|ends? at)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/gi
  let m: RegExpExecArray | null
  while ((m = timeRx.exec(text)) !== null) {
    let hour = Number(m[1])
    const meridiem = m[3].toLowerCase().replace(/\./g, '')
    if (meridiem === 'pm' && hour !== 12) hour += 12
    if (meridiem === 'am' && hour === 12) hour = 24 // midnight
    if (meridiem === 'am' && hour <= 5) hour += 24  // 2am reads as "late", not early
    latestMentioned = Math.max(latestMentioned ?? 0, hour)
  }

  if (/\b(overnight|graveyard|third shift|3rd shift|midnight shift)\b/i.test(text)) {
    latestMentioned = Math.max(latestMentioned ?? 0, 25)
  }

  if (latestMentioned !== null) {
    if (latestMentioned > latest1415) {
      conflicts.push({ band: '14_15', detail: `shift ends past ${latest1415}:00, the ${state} limit for 14 to 15` })
    }
    if (latestMentioned > latest1617) {
      conflicts.push({ band: '16_17', detail: `shift ends past ${latest1617}:00, the ${state} limit for 16 to 17` })
    }
  }

  // Weekly hour commitments, e.g. "30 hours per week", "35-40 hrs/week"
  const weekRx = /\b(\d{1,2})\s*(?:-\s*(\d{1,2})\s*)?(?:hours?|hrs?)\s*(?:per|a|\/)\s*week\b/gi
  let maxWeek: number | null = null
  while ((m = weekRx.exec(text)) !== null) {
    maxWeek = Math.max(maxWeek ?? 0, Number(m[2] ?? m[1]))
  }
  if (maxWeek !== null) {
    if (maxWeek > HOURS_RULES[state]['14_15'][season].maxWeekHours) {
      conflicts.push({ band: '14_15', detail: `${maxWeek} hours a week exceeds the ${HOURS_RULES[state]['14_15'][season].maxWeekHours} hour limit for 14 to 15` })
    }
    if (maxWeek > HOURS_RULES[state]['16_17'][season].maxWeekHours) {
      conflicts.push({ band: '16_17', detail: `${maxWeek} hours a week exceeds the ${HOURS_RULES[state]['16_17'][season].maxWeekHours} hour limit for 16 to 17` })
    }
  }

  const blocks1415 = conflicts.some((c) => c.band === '14_15')
  const blocks1617 = conflicts.some((c) => c.band === '16_17')
  const impliedMinAge = blocks1617 ? 18 : blocks1415 ? 16 : null

  return { impliedMinAge, conflicts }
}

/**
 * Infer the governing state from a location string. Defaults to NJ.
 *
 * West New York is a Hudson County town whose name contains "New York", so it
 * has to be neutralized before any NY matching runs. This is the same
 * substring trap that once let "Sunnyvale" match "ny" and pulled California
 * jobs into the feed.
 */
export function stateFromLocation(location?: string | null): StateCode {
  if (!location) return 'NJ'
  const cleaned = location.toLowerCase().replace(/west new york/g, 'wny_hudson')

  // An explicit NJ marker always wins.
  if (/\bnew jersey\b|\bn\.?j\.?\b/.test(cleaned)) return 'NJ'
  if (/\bny\b|new york|brooklyn|queens|bronx|staten island|manhattan|yonkers/.test(cleaned)) return 'NY'
  return 'NJ'
}

/**
 * The one call ingest and audit both use.
 *
 * Combines three independent facts and keeps them separable afterwards:
 *   legal_min_age    what the law permits for this occupation
 *   employer_min_age what the employer actually told us, or null for unknown
 *   effective_min_age what we filter and display on
 *
 * `employer_min_age` is only populated when we genuinely know it: the posting
 * stated an age, or a trusted source declared one. A brand-table guess is NOT
 * knowledge and stays null, because "we have never checked" and "they said 16"
 * lead to different actions. Null with a legal age below 16 is a call-to-verify
 * lead, and that list is where 14-year-old supply actually comes from.
 */
export function resolveAllAgeFacts(args: {
  title: string
  company: string
  description?: string | null
  location?: string | null
  /** Age declared by a trusted ingest source (tenant config, curated entry). */
  declaredMinAge?: number | null
  /** Curated program pages are hand-verified; skip text inference. */
  trusted?: boolean
  schoolInSession?: boolean
}): {
  legal_min_age: number
  employer_min_age: number | null
  effective_min_age: number
  work_state: StateCode
  reasons: string[]
  /**
   * False when NO occupation rule matched and the number is the fallthrough
   * default rather than a verdict.
   *
   * This has to leave the function. Without it, "we have never seen this kind
   * of work" and "the law says 16" are the same integer, and callers cannot
   * tell them apart. That is not academic: the audit fell through to 16 on
   * "Associate Fire Protection Inspector II" and "AIU Psychologist" and
   * rewrote both DOWN from 18. Ignorance must never relax a gate.
   */
  legal_matched: boolean
} {
  const work_state = stateFromLocation(args.location)
  const reasons: string[] = []

  const legal = resolveLegalMinAge(args.title, args.description, work_state)
  reasons.push(`legal: ${legal.reason}`)

  // Employer side. Explicit statements in the posting are the only thing that
  // counts as knowledge, plus a declared age from a trusted source.
  const stated = statedMinAge(`${args.title} ${args.description ?? ''}`)
  let employer_min_age: number | null = null
  if (stated !== null) {
    employer_min_age = stated
    reasons.push(`employer states ${stated}+`)
  } else if (typeof args.declaredMinAge === 'number') {
    employer_min_age = args.declaredMinAge
    reasons.push(`declared by source: ${args.declaredMinAge}+`)
  } else {
    reasons.push('employer policy unknown')
  }

  if (args.trusted && typeof args.declaredMinAge === 'number') {
    // Hand-verified program entry. Trust it outright, but never below the law.
    const effective = Math.max(args.declaredMinAge, legal.legal_min_age)
    reasons.push('hand-verified entry')
    return { legal_min_age: legal.legal_min_age, employer_min_age: args.declaredMinAge, effective_min_age: effective, work_state, reasons, legal_matched: legal.matched }
  }

  const hours = detectHoursConflicts(`${args.title} ${args.description ?? ''}`, work_state, args.schoolInSession ?? true)
  for (const c of hours.conflicts) reasons.push(`hours: ${c.detail}`)

  // Brand-level defaults still inform the effective number even though they are
  // not knowledge. A recognized 16+ brand should not surface to a 14-year-old
  // just because this particular posting forgot to say so.
  const brand = getCompanyProfile(args.company)
  const brandFloor = TEEN_FRIENDLY_COMPANIES[Object.keys(TEEN_FRIENDLY_COMPANIES).find((k) => args.company.toLowerCase().includes(k)) ?? '']
    ? brand.min_age
    : 0
  if (brandFloor) reasons.push(`brand default ${brandFloor}+`)

  const effective_min_age = Math.max(
    legal.legal_min_age,
    hours.impliedMinAge ?? 0,
    employer_min_age ?? 0,
    brandFloor,
  )

  return { legal_min_age: legal.legal_min_age, employer_min_age, effective_min_age, work_state, reasons, legal_matched: legal.matched }
}

/**
 * Lower-level combiner kept for direct callers. Prefer resolveAllAgeFacts.
 */
export function resolveEffectiveMinAge(args: {
  title: string
  description?: string | null
  location?: string | null
  employerMinAge?: number | null
  schoolInSession?: boolean
}): { legal_min_age: number; effective_min_age: number; state: StateCode; reasons: string[] } {
  const state = stateFromLocation(args.location)
  const reasons: string[] = []

  const legal = resolveLegalMinAge(args.title, args.description, state)
  reasons.push(legal.reason)

  const hours = detectHoursConflicts(`${args.title} ${args.description ?? ''}`, state, args.schoolInSession ?? true)
  for (const c of hours.conflicts) reasons.push(c.detail)

  let effective = Math.max(legal.legal_min_age, hours.impliedMinAge ?? 0)
  if (typeof args.employerMinAge === 'number' && args.employerMinAge > effective) {
    effective = args.employerMinAge
    reasons.push(`employer states ${args.employerMinAge}+`)
  }

  return { legal_min_age: legal.legal_min_age, effective_min_age: effective, state, reasons }
}
