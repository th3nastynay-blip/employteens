// @ts-nocheck
/**
 * EMPLOYTEENS — Deduplication Engine
 * Prevents inserting duplicate jobs using multi-signal fingerprinting
 */

import { supabaseAdmin } from './lib/supabase-admin'
import type { RawJob } from './types'

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
}

function buildFingerprint(job: RawJob): string {
  const title = normalize(job.title)
  const company = normalize(job.company)
  const location = normalize(job.location)
  return `${title}|${company}|${location}`
}

function stripUTM(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.delete('utm_source')
    u.searchParams.delete('utm_medium')
    u.searchParams.delete('utm_campaign')
    u.searchParams.delete('ref')
    return u.origin + u.pathname
  } catch {
    return url
  }
}

export async function deduplicateJob(job: RawJob): Promise<boolean> {
  const fingerprint = buildFingerprint(job)
  const cleanUrl = stripUTM(job.apply_url)

  // Check by title + company + location (normalized)
  const [titlePart, companyPart] = fingerprint.split('|')

  const { data: matches } = await supabaseAdmin
    .from('jobs')
    .select('id, title, company, location, apply_url')
    .ilike('company', `%${job.company.split(' ')[0]}%`)
    .ilike('title', `%${job.title.split(' ').slice(0, 2).join('%')}%`)
    .eq('state', job.state)
    .limit(10)

  if (!matches || matches.length === 0) return false

  for (const existing of matches) {
    // URL match
    if (stripUTM(existing.apply_url) === cleanUrl) return true

    // Fingerprint match
    const existingFp = buildFingerprint({
      title: existing.title,
      company: existing.company,
      location: existing.location,
      state: '',
      zip_code: '',
      apply_url: '',
      source: '',
    })

    if (existingFp === fingerprint) return true

    // Fuzzy title+company match
    const titleSimilarity = jaroWinkler(normalize(existing.title), normalize(job.title))
    const companySimilarity = jaroWinkler(normalize(existing.company), normalize(job.company))

    if (titleSimilarity > 0.9 && companySimilarity > 0.85) return true
  }

  return false
}

// Jaro-Winkler similarity for fuzzy string matching
function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1
  if (s1.length === 0 || s2.length === 0) return 0

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1
  const s1Matches = new Array(s1.length).fill(false)
  const s2Matches = new Array(s2.length).fill(false)

  let matches = 0
  let transpositions = 0

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, s2.length)

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  let k = 0
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3

  // Winkler boost for common prefix
  let prefix = 0
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) prefix++
    else break
  }

  return jaro + 0.1 * prefix * (1 - jaro)
}
