/**
 * EMPLOYTEENS — AI Job Enrichment Pipeline
 * Takes raw job data and produces all enrichment scores using rule-based AI
 * Falls back to OpenAI GPT-4o if available for nuanced scoring
 */

import type { RawJob, EnrichedJob } from './types'

// =============================================
// KNOWN TEEN-FRIENDLY COMPANY SCORES
// =============================================
const COMPANY_PROFILES: Record<string, Partial<EnrichedJob>> = {
  'chipotle': { teen_friendly_score: 92, schedule_flexibility_score: 88, hiring_speed_score: 85, min_age: 16 },
  'mcdonald': { teen_friendly_score: 87, schedule_flexibility_score: 92, hiring_speed_score: 95, min_age: 14 },
  'starbucks': { teen_friendly_score: 90, schedule_flexibility_score: 82, hiring_speed_score: 70, min_age: 16 },
  'target': { teen_friendly_score: 88, schedule_flexibility_score: 85, hiring_speed_score: 78, min_age: 16 },
  'walmart': { teen_friendly_score: 82, schedule_flexibility_score: 80, hiring_speed_score: 82, min_age: 16 },
  'chick-fil-a': { teen_friendly_score: 93, schedule_flexibility_score: 87, hiring_speed_score: 75, min_age: 15 },
  'amc': { teen_friendly_score: 95, schedule_flexibility_score: 90, hiring_speed_score: 80, min_age: 14 },
  'regal': { teen_friendly_score: 93, schedule_flexibility_score: 88, hiring_speed_score: 78, min_age: 14 },
  'home depot': { teen_friendly_score: 85, schedule_flexibility_score: 75, hiring_speed_score: 72, min_age: 16 },
  "lowe's": { teen_friendly_score: 84, schedule_flexibility_score: 74, hiring_speed_score: 70, min_age: 16 },
  'shake shack': { teen_friendly_score: 89, schedule_flexibility_score: 83, hiring_speed_score: 80, min_age: 16 },
  'sweetgreen': { teen_friendly_score: 86, schedule_flexibility_score: 80, hiring_speed_score: 75, min_age: 16 },
  'five guys': { teen_friendly_score: 88, schedule_flexibility_score: 85, hiring_speed_score: 88, min_age: 16 },
  'planet fitness': { teen_friendly_score: 82, schedule_flexibility_score: 88, hiring_speed_score: 72, min_age: 16 },
  'equinox': { teen_friendly_score: 75, schedule_flexibility_score: 80, hiring_speed_score: 65, min_age: 16 },
  'cvs': { teen_friendly_score: 83, schedule_flexibility_score: 78, hiring_speed_score: 74, min_age: 16 },
  'walgreen': { teen_friendly_score: 82, schedule_flexibility_score: 77, hiring_speed_score: 73, min_age: 16 },
}

// =============================================
// TITLE-BASED SCORING
// =============================================
const TITLE_PROFILES: Record<string, Partial<EnrichedJob>> = {
  cashier: { physical_demand_level: 30, customer_interaction_level: 80, teen_friendly_score: 85 },
  barista: { physical_demand_level: 35, customer_interaction_level: 85, teen_friendly_score: 88 },
  'team member': { physical_demand_level: 50, customer_interaction_level: 75, teen_friendly_score: 86 },
  'crew member': { physical_demand_level: 55, customer_interaction_level: 70, teen_friendly_score: 85 },
  'sales associate': { physical_demand_level: 35, customer_interaction_level: 80, teen_friendly_score: 82 },
  'stock associate': { physical_demand_level: 70, customer_interaction_level: 30, teen_friendly_score: 78 },
  host: { physical_demand_level: 30, customer_interaction_level: 90, teen_friendly_score: 84 },
  busser: { physical_demand_level: 65, customer_interaction_level: 60, teen_friendly_score: 80 },
  'front desk': { physical_demand_level: 20, customer_interaction_level: 90, teen_friendly_score: 82 },
  bagger: { physical_demand_level: 55, customer_interaction_level: 50, teen_friendly_score: 80 },
  'delivery driver': { physical_demand_level: 60, customer_interaction_level: 40, teen_friendly_score: 70 },
  tutor: { physical_demand_level: 10, customer_interaction_level: 70, teen_friendly_score: 78 },
  lifeguard: { physical_demand_level: 60, customer_interaction_level: 50, teen_friendly_score: 85 },
}

// =============================================
// SCAM DETECTION RULES
// =============================================
function detectScamRisk(job: RawJob): number {
  let score = 0
  const text = `${job.title} ${job.company} ${job.description ?? ''} ${job.apply_url}`.toLowerCase()

  // High-risk signals
  if (text.includes('make money fast')) score += 40
  if (text.includes('work from home earn')) score += 30
  if (text.includes('no experience earn $')) score += 25
  if (text.includes('$500/day') || text.includes('$1000/day')) score += 50
  if (text.includes('mlm') || text.includes('network marketing')) score += 60
  if (text.includes('commission only')) score += 20
  if (text.includes('send money')) score += 80
  if (text.includes('wire transfer')) score += 80
  if (text.includes('gift card')) score += 70

  // Suspicious URLs
  const url = job.apply_url.toLowerCase()
  if (!url.startsWith('https')) score += 20
  if (url.includes('bit.ly') || url.includes('tinyurl')) score += 30
  if (url.includes('craigslist')) score += 25

  // Legitimate signals (reduce risk)
  const knownDomains = ['.com/careers', 'greenhouse.io', 'lever.co', 'workday.com', 'taleo.net', 'icims.com', 'ashbyhq.com', 'smartrecruiters.com']
  if (knownDomains.some((d) => url.includes(d))) score = Math.max(0, score - 30)

  // Known legit companies
  const company = job.company.toLowerCase()
  const legitCompanies = ['chipotle', 'starbucks', 'mcdonald', 'target', 'walmart', 'amc', 'regal', 'home depot']
  if (legitCompanies.some((c) => company.includes(c))) score = 0

  return Math.min(100, Math.max(0, score))
}

// =============================================
// SCHEDULE FLEXIBILITY SCORING
// =============================================
function scoreScheduleFlexibility(job: RawJob): number {
  const text = `${job.title} ${job.description ?? ''}`.toLowerCase()
  let score = 60 // base

  if (text.includes('flexible') || text.includes('flexible hours')) score += 20
  if (text.includes('part time') || text.includes('part-time')) score += 15
  if (text.includes('weekend')) score += 10
  if (text.includes('evening')) score += 10
  if (text.includes('summer')) score += 5
  if (text.includes('full time only')) score -= 25
  if (text.includes('monday-friday')) score -= 15
  if (text.includes('9am-5pm')) score -= 20

  return Math.min(100, Math.max(20, score))
}

// =============================================
// HIRING SPEED SCORING
// =============================================
function scoreHiringSpeed(job: RawJob): number {
  const company = job.company.toLowerCase()
  const text = (job.description ?? '').toLowerCase()

  let score = 65 // base

  if (text.includes('immediate') || text.includes('start asap')) score += 25
  if (text.includes('same week') || text.includes('next week')) score += 20
  if (text.includes('apply in person')) score += 15
  if (text.includes('interview on site') || text.includes('walk-in')) score += 20
  if (text.includes('background check required')) score -= 10
  if (text.includes('drug test')) score -= 5

  // Fast-hire companies known from data
  const fastHire = ['mcdonald', 'chipotle', 'five guys', 'shake shack', 'pizza']
  if (fastHire.some((c) => company.includes(c))) score += 20

  return Math.min(100, Math.max(20, score))
}

// =============================================
// COMMUTE ESTIMATE (minutes from ZIP)
// =============================================
function estimateCommute(job: RawJob): number {
  // Default 30 min — in production use Distance Matrix API
  const loc = job.location.toLowerCase()
  if (loc.includes('manhattan') || loc.includes('new york, ny')) return 20
  if (loc.includes('brooklyn') || loc.includes('queens')) return 35
  if (loc.includes('bronx')) return 40
  if (loc.includes('staten island')) return 55
  if (loc.includes('jersey city') || loc.includes('hoboken')) return 35
  if (loc.includes('newark')) return 45
  return 30
}

// =============================================
// MAIN ENRICHMENT FUNCTION
// =============================================
export async function enrichJob(raw: RawJob): Promise<EnrichedJob> {
  const companyKey = Object.keys(COMPANY_PROFILES).find((k) => raw.company.toLowerCase().includes(k))
  const companyProfile = companyKey ? COMPANY_PROFILES[companyKey] : {}

  const titleKey = Object.keys(TITLE_PROFILES).find((k) => raw.title.toLowerCase().includes(k))
  const titleProfile = titleKey ? TITLE_PROFILES[titleKey] : {}

  const scam_risk_score = detectScamRisk(raw)
  const schedule_flexibility_score = companyProfile.schedule_flexibility_score ?? scoreScheduleFlexibility(raw)
  const hiring_speed_score = companyProfile.hiring_speed_score ?? scoreHiringSpeed(raw)
  const teen_friendly_score = companyProfile.teen_friendly_score ?? titleProfile.teen_friendly_score ?? 70
  const physical_demand_level = titleProfile.physical_demand_level ?? 50
  const customer_interaction_level = titleProfile.customer_interaction_level ?? 60
  const commute_estimate = estimateCommute(raw)

  // Determine experience required from description
  const desc = (raw.description ?? '').toLowerCase()
  let experience_required = 'none'
  if (desc.includes('1 year') || desc.includes('one year')) experience_required = '1_year'
  else if (desc.includes('experience preferred')) experience_required = 'preferred'

  // Generate tags
  const tags: string[] = []
  if (teen_friendly_score >= 85) tags.push('teen-friendly')
  if (hiring_speed_score >= 80) tags.push('hires-fast')
  if (schedule_flexibility_score >= 80) tags.push('flexible-schedule')
  if ((raw.min_age ?? 16) <= 14) tags.push('14-plus')
  if ((raw.min_age ?? 16) <= 15) tags.push('15-plus')
  if (scam_risk_score === 0) tags.push('verified')

  return {
    ...raw,
    teen_friendly_score,
    schedule_flexibility_score,
    hiring_speed_score,
    scam_risk_score,
    commute_estimate,
    physical_demand_level,
    customer_interaction_level,
    experience_required,
    tags,
    min_age: raw.min_age ?? companyProfile.min_age ?? 16,
  }
}

// =============================================
// AI ENRICHMENT (OpenAI — used when available)
// =============================================
export async function enrichWithOpenAI(job: RawJob): Promise<Partial<EnrichedJob>> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return {}

  try {
    const prompt = `You are a teen job market expert for NY/NJ. Score this job for teens 14-19.

Job: ${job.title} at ${job.company}
Location: ${job.location}
Description: ${job.description?.slice(0, 500) ?? 'Not provided'}

Return JSON only:
{
  "teen_friendly_score": 0-100,
  "schedule_flexibility_score": 0-100,
  "hiring_speed_score": 0-100,
  "scam_risk_score": 0-100,
  "physical_demand_level": 0-100,
  "customer_interaction_level": 0-100,
  "experience_required": "none|preferred|1_year|2_plus_years",
  "min_age": 14-18,
  "tags": ["teen-friendly", "hires-fast", "flexible-schedule"],
  "reasoning": "one sentence"
}`

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 300,
        temperature: 0.2,
      }),
    })

    const data = await res.json()
    return JSON.parse(data.choices?.[0]?.message?.content ?? '{}')
  } catch {
    return {}
  }
}
