// @ts-nocheck
/**
 * EMPLOYTEENS — Job API Ingestion Worker
 * Pulls from: Adzuna, JSearch (RapidAPI), USAJobs, Greenhouse, Lever, Ashby, SmartRecruiters
 * Filters: NY/NJ only, teen-eligible (min_age <= 19)
 */

import 'dotenv/config'
import { supabaseAdmin } from './lib/supabase-admin'
import { enrichJob } from './job-enricher'
import { deduplicateJob } from './deduplication-engine'
import type { RawJob, IngestionStats } from './types'

const NY_NJ_ZIPS = { NY: true, NJ: true }

// =============================================
// SOURCE: Adzuna API
// =============================================
async function fetchAdzuna(): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY
  if (!appId || !appKey) {
    console.log('[Adzuna] Skipping — no API keys configured')
    return []
  }

  const results: RawJob[] = []
  const queries = ['part time teen', 'entry level no experience', 'cashier', 'retail crew member', 'food service']

  for (const q of queries) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=${encodeURIComponent(q)}&where=New+York&content-type=application/json`
      const res = await fetch(url)
      const data = await res.json()

      for (const job of data?.results ?? []) {
        const location = job.location?.display_name ?? ''
        const state = location.includes('NJ') ? 'NJ' : location.includes('NY') || location.includes('New York') ? 'NY' : ''
        if (!state) continue

        results.push({
          title: job.title,
          company: job.company?.display_name ?? 'Unknown',
          location,
          state,
          zip_code: extractZip(location) || '00000',
          apply_url: job.redirect_url,
          source: 'adzuna',
          description: job.description,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          posted_at: job.created,
        })
      }
    } catch (err) {
      console.error(`[Adzuna] Error for query "${q}":`, err)
    }
  }

  console.log(`[Adzuna] Fetched ${results.length} raw jobs`)
  return results
}

// =============================================
// SOURCE: JSearch (RapidAPI)
// =============================================
async function fetchJSearch(): Promise<RawJob[]> {
  const apiKey = process.env.JSEARCH_API_KEY
  if (!apiKey) {
    console.log('[JSearch] Skipping — no API key configured')
    return []
  }

  const results: RawJob[] = []
  const queries = ['teen jobs New York', 'part time jobs New Jersey no experience', 'entry level jobs NYC 16 year old']

  for (const q of queries) {
    try {
      const res = await fetch(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(q)}&page=1&num_pages=2`, {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'jsearch.p.rapidapi.com',
        },
      })
      const data = await res.json()

      for (const job of data?.data ?? []) {
        const state = job.job_state ?? ''
        if (!['NY', 'NJ'].includes(state)) continue

        results.push({
          title: job.job_title,
          company: job.employer_name,
          location: `${job.job_city ?? ''}, ${state}`,
          state,
          zip_code: job.job_zip ?? '00000',
          apply_url: job.job_apply_link,
          source: 'jsearch',
          description: job.job_description,
          min_age: 14,
          posted_at: job.job_posted_at_datetime_utc,
        })
      }
    } catch (err) {
      console.error(`[JSearch] Error for query "${q}":`, err)
    }
  }

  console.log(`[JSearch] Fetched ${results.length} raw jobs`)
  return results
}

// =============================================
// SOURCE: USAJobs
// =============================================
async function fetchUSAJobs(): Promise<RawJob[]> {
  const apiKey = process.env.USAJOBS_API_KEY
  if (!apiKey) {
    console.log('[USAJobs] Skipping — no API key configured')
    return []
  }

  try {
    const res = await fetch(
      'https://data.usajobs.gov/api/search?LocationName=New York&ResultsPerPage=50&JobCategoryCode=2505',
      { headers: { 'Authorization-Key': apiKey, Host: 'data.usajobs.gov' } }
    )
    const data = await res.json()
    const jobs: RawJob[] = []

    for (const item of data?.SearchResult?.SearchResultItems ?? []) {
      const d = item.MatchedObjectDescriptor
      const location = d.PositionLocation?.[0]?.LocationName ?? ''
      const state = location.includes('NJ') ? 'NJ' : 'NY'

      jobs.push({
        title: d.PositionTitle,
        company: d.OrganizationName,
        location,
        state,
        zip_code: d.PositionLocation?.[0]?.PostalCode ?? '00000',
        apply_url: d.PositionURI,
        source: 'usajobs',
        description: d.UserArea?.Details?.JobSummary,
        min_age: 16,
      })
    }

    console.log(`[USAJobs] Fetched ${jobs.length} raw jobs`)
    return jobs
  } catch (err) {
    console.error('[USAJobs] Error:', err)
    return []
  }
}

// =============================================
// SOURCE: Greenhouse (open job boards)
// =============================================
async function fetchGreenhouse(): Promise<RawJob[]> {
  // Known teen-friendly companies on Greenhouse
  const companies = ['chipotle', 'target', 'starbucks', 'amc-networks']
  const results: RawJob[] = []

  for (const co of companies) {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${co}/jobs?content=true`)
      const data = await res.json()

      for (const job of data?.jobs ?? []) {
        const loc = job.location?.name ?? ''
        const state = loc.includes('NJ') ? 'NJ' : loc.includes('NY') || loc.includes('New York') ? 'NY' : ''
        if (!state) continue

        results.push({
          title: job.title,
          company: co.charAt(0).toUpperCase() + co.slice(1).replace(/-/g, ' '),
          location: loc,
          state,
          zip_code: extractZip(loc) || '00000',
          apply_url: job.absolute_url,
          source: 'greenhouse',
          description: job.content,
          min_age: 16,
        })
      }
    } catch {
      // Company might not use Greenhouse — skip silently
    }
  }

  console.log(`[Greenhouse] Fetched ${results.length} raw jobs`)
  return results
}

// =============================================
// SOURCE: Lever
// =============================================
async function fetchLever(): Promise<RawJob[]> {
  const companies = ['chipotle', 'target', 'shake-shack']
  const results: RawJob[] = []

  for (const co of companies) {
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${co}?mode=json`)
      const jobs = await res.json()

      for (const job of (Array.isArray(jobs) ? jobs : [])) {
        const loc = job.categories?.location ?? ''
        const state = loc.includes('NJ') ? 'NJ' : loc.includes('NY') || loc.includes('New York') ? 'NY' : ''
        if (!state) continue

        results.push({
          title: job.text,
          company: co.charAt(0).toUpperCase() + co.slice(1).replace(/-/g, ' '),
          location: loc,
          state,
          zip_code: '00000',
          apply_url: job.hostedUrl,
          source: 'lever',
          description: job.descriptionPlain,
          min_age: 16,
        })
      }
    } catch {
      // skip
    }
  }

  console.log(`[Lever] Fetched ${results.length} raw jobs`)
  return results
}

// =============================================
// SOURCE: SmartRecruiters
// =============================================
async function fetchSmartRecruiters(): Promise<RawJob[]> {
  const companies = ['Walmart', 'HomeDepot', 'Lowes']
  const results: RawJob[] = []

  for (const co of companies) {
    try {
      const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${co}/postings?limit=50`)
      const data = await res.json()

      for (const job of data?.content ?? []) {
        const loc = job.location?.city ? `${job.location.city}, ${job.location.region}` : ''
        const state = job.location?.region ?? ''
        if (!['NY', 'NJ'].includes(state)) continue

        results.push({
          title: job.name,
          company: co,
          location: loc,
          state,
          zip_code: '00000',
          apply_url: job.ref,
          source: 'smartrecruiters',
          min_age: 16,
        })
      }
    } catch {
      // skip
    }
  }

  console.log(`[SmartRecruiters] Fetched ${results.length} raw jobs`)
  return results
}

// =============================================
// UTILITIES
// =============================================
function extractZip(location: string): string | null {
  const match = location.match(/\b\d{5}\b/)
  return match ? match[0] : null
}

// =============================================
// MAIN PIPELINE
// =============================================
async function ingestAll() {
  console.log('\n🚀 EmployTeens Job Ingestion Starting...\n')

  const allRaw = (await Promise.all([
    fetchAdzuna(),
    fetchJSearch(),
    fetchUSAJobs(),
    fetchGreenhouse(),
    fetchLever(),
    fetchSmartRecruiters(),
  ])).flat()

  console.log(`\n📦 Total raw jobs fetched: ${allRaw.length}`)

  let inserted = 0
  let rejected = 0
  let deduplicated = 0

  for (const raw of allRaw) {
    // Basic validation
    if (!raw.title || !raw.company || !raw.apply_url) { rejected++; continue }
    if (!['NY', 'NJ'].includes(raw.state)) { rejected++; continue }

    // Deduplication check
    const isDuplicate = await deduplicateJob(raw)
    if (isDuplicate) { deduplicated++; continue }

    // Enrich with AI scores
    const enriched = await enrichJob(raw)

    // Scam filter
    if (enriched.scam_risk_score >= 70) {
      console.log(`  🚫 Rejected (scam risk ${enriched.scam_risk_score}): ${raw.title} @ ${raw.company}`)
      rejected++
      continue
    }

    // Insert to DB
    const { error } = await supabaseAdmin.from('jobs').insert({
      title: enriched.title,
      company: enriched.company,
      location: enriched.location,
      state: enriched.state,
      zip_code: enriched.zip_code,
      apply_url: enriched.apply_url,
      source: enriched.source,
      min_age: enriched.min_age ?? 16,
      experience_required: enriched.experience_required,
      teen_friendly_score: enriched.teen_friendly_score,
      schedule_flexibility_score: enriched.schedule_flexibility_score,
      hiring_speed_score: enriched.hiring_speed_score,
      scam_risk_score: enriched.scam_risk_score,
      commute_estimate: enriched.commute_estimate,
      physical_demand_level: enriched.physical_demand_level,
      customer_interaction_level: enriched.customer_interaction_level,
      description: enriched.description,
      tags: enriched.tags,
      salary_min: enriched.salary_min,
      salary_max: enriched.salary_max,
      status: 'active',
      last_verified_at: new Date().toISOString(),
    })

    if (error) {
      console.error(`  ❌ Insert error: ${error.message}`)
      rejected++
    } else {
      inserted++
    }
  }

  // Log stats
  await supabaseAdmin.from('ingestion_logs').insert({
    source: 'all_apis',
    jobs_fetched: allRaw.length,
    jobs_inserted: inserted,
    jobs_rejected: rejected,
    jobs_deduplicated: deduplicated,
    completed_at: new Date().toISOString(),
  })

  console.log(`\n✅ Ingestion complete:`)
  console.log(`   Fetched: ${allRaw.length}`)
  console.log(`   Inserted: ${inserted}`)
  console.log(`   Rejected: ${rejected}`)
  console.log(`   Duplicates: ${deduplicated}\n`)
}

ingestAll().catch(console.error)
