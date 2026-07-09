/**
 * EMPLOYTEENS — Job Quality Score
 *
 * One number (0–100) answering: "how confident are we that this listing is
 * a legitimate, directly-applicable, accurately-described job?" Jobs below
 * MIN_QUALITY_SCORE are never shown (status 'flagged' — hidden, reversible,
 * distinct from 'inactive' so we know why it disappeared).
 *
 * The score is persisted in tags as `_q:NN` (underscore-prefixed tags are
 * machine-only and filtered from the UI) so reporting can aggregate it
 * without a schema change.
 */

import { isSpecificJobPosting, isAggregatorUrl } from './verify-url'
import { TEEN_FRIENDLY_COMPANIES } from './teen-scoring'

export const MIN_QUALITY_SCORE = 55

// Employer-owned ATS domains — landing here means a real application flow
const DIRECT_ATS_DOMAINS = [
  'greenhouse.io', 'lever.co', 'ashbyhq.com', 'smartrecruiters.com',
  'myworkdayjobs.com', 'workday.com', 'icims.com', 'taleo.net',
  'applytojob.com', 'breezy.hr', 'bamboohr.com', 'paycomonline.net',
  'paylocity.com', 'adp.com', 'ultipro.com', 'workstream.us', 'jobvite.com',
  'oraclecloud.com', 'successfactors.com', 'dayforcehcm.com',
]

export interface QualityInput {
  apply_url: string
  company: string
  title_confidence: number   // from cleanJobTitle (0–100)
  scam_risk_score: number
  salary_min?: number | null
  description?: string | null
  posted_at?: string | null
  /** true for curated local-source entries (hand-verified at curation) */
  is_curated?: boolean
}

export interface QualityResult {
  score: number
  signals: string[]
}

export function computeQualityScore(job: QualityInput): QualityResult {
  const signals: string[] = []
  let score = 30 // base: it survived URL verification to get here

  // Curated entries were hand-verified — that's the strongest signal we have
  if (job.is_curated) {
    signals.push('hand-curated source')
    score += 35
  }

  let host = ''
  try { host = new URL(job.apply_url).hostname.toLowerCase() } catch { /* scored below */ }

  if (isAggregatorUrl(job.apply_url)) {
    // Shouldn't reach scoring, but belt-and-suspenders: aggregators bottom out
    return { score: 0, signals: ['aggregator destination'] }
  }

  if (DIRECT_ATS_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    signals.push('direct ATS application')
    score += 25
  } else if (host) {
    // Employer's own domain (not an ATS, not an aggregator)
    signals.push('employer website')
    score += 15
  }

  const company = job.company?.toLowerCase() ?? ''
  if (Object.keys(TEEN_FRIENDLY_COMPANIES).some((k) => company.includes(k))) {
    signals.push('recognized employer')
    score += 10
  }

  if (isSpecificJobPosting(job.apply_url)) {
    signals.push('specific position URL')
    score += 10
  }

  // Title confidence contributes up to 15
  const titleContribution = Math.round((job.title_confidence / 100) * 15)
  if (job.title_confidence >= 90) signals.push('high-confidence title')
  else if (job.title_confidence < 50) signals.push('low-confidence title')
  score += titleContribution

  if (job.posted_at) {
    const days = (Date.now() - new Date(job.posted_at).getTime()) / 86_400_000
    if (days <= 7) { signals.push('posted this week'); score += 8 }
    else if (days <= 21) score += 4
  }

  if (job.salary_min) { signals.push('pay listed'); score += 4 }
  if ((job.description?.length ?? 0) >= 120) score += 4

  score -= Math.round(job.scam_risk_score / 2)
  if (job.scam_risk_score >= 30) signals.push('scam-risk signals present')

  return { score: Math.max(0, Math.min(100, score)), signals }
}

/** Encode/decode the machine-only quality tag. */
export function qualityTag(score: number): string {
  return `_q:${score}`
}

export function readQualityTag(tags: string[] | null | undefined): number | null {
  const t = (tags ?? []).find((x) => x.startsWith('_q:'))
  if (!t) return null
  const n = parseInt(t.slice(3), 10)
  return Number.isFinite(n) ? n : null
}

/** UI helper: tags users should actually see. */
export function visibleTags(tags: string[] | null | undefined): string[] {
  return (tags ?? []).filter((t) => !t.startsWith('_'))
}
