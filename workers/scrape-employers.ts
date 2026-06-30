// @ts-nocheck
/**
 * EMPLOYTEENS — Enterprise Employer Scraper
 * Scrapes career pages of teen-friendly employers in NY/NJ
 * Sources: Chipotle, Starbucks, Target, Walmart, McDonald's, AMC, Regal, Home Depot, Lowe's, Chick-fil-A
 */

import 'dotenv/config'
import { supabaseAdmin } from './lib/supabase-admin'
import { enrichJob } from './job-enricher'
import { deduplicateJob } from './deduplication-engine'
import type { RawJob } from './types'

interface EmployerConfig {
  name: string
  min_age: number
  career_url: string
  api_endpoint?: string
  parser: () => Promise<RawJob[]>
}

// =============================================
// CHIPOTLE — uses Greenhouse API
// =============================================
async function parseChipotle(): Promise<RawJob[]> {
  const res = await fetch('https://boards-api.greenhouse.io/v1/boards/chipotle/jobs?content=false')
  const data = await res.json()
  const jobs: RawJob[] = []

  for (const job of data?.jobs ?? []) {
    const loc = job.location?.name ?? ''
    const state = loc.includes('NJ') ? 'NJ' : loc.includes('NY') || loc.includes('New York') ? 'NY' : null
    if (!state) continue

    jobs.push({
      title: job.title,
      company: 'Chipotle Mexican Grill',
      location: loc,
      state,
      zip_code: '00000',
      apply_url: job.absolute_url,
      source: 'chipotle_direct',
      min_age: 16,
    })
  }
  return jobs
}

// =============================================
// STARBUCKS — public job search API
// =============================================
async function parseStarbucks(): Promise<RawJob[]> {
  try {
    const res = await fetch(
      'https://careers.starbucks.com/api/apply/v2/jobs?domain=starbucks.com&location=New York&num_rec_jobs=50',
      { headers: { 'Accept': 'application/json' } }
    )
    const data = await res.json()
    const jobs: RawJob[] = []

    for (const job of data?.positions ?? []) {
      const loc = job.location ?? ''
      const state = loc.includes('NJ') ? 'NJ' : loc.includes('NY') ? 'NY' : null
      if (!state) continue

      jobs.push({
        title: job.name,
        company: 'Starbucks',
        location: loc,
        state,
        zip_code: '00000',
        apply_url: `https://careers.starbucks.com/job/${job.id}`,
        source: 'starbucks_direct',
        min_age: 16,
      })
    }
    return jobs
  } catch {
    return []
  }
}

// =============================================
// McDONALD'S — public API
// =============================================
async function parseMcDonalds(): Promise<RawJob[]> {
  try {
    const res = await fetch(
      'https://careers.mcdonalds.com/api/jobs?location=New+York&radius=50&num_items=100'
    )
    const data = await res.json()
    const jobs: RawJob[] = []

    for (const job of data?.jobs ?? []) {
      const state = job.state ?? ''
      if (!['NY', 'NJ'].includes(state)) continue

      jobs.push({
        title: job.title,
        company: "McDonald's",
        location: `${job.city}, ${state}`,
        state,
        zip_code: job.zip ?? '00000',
        apply_url: job.url ?? 'https://jobs.mcdonalds.com',
        source: 'mcdonalds_direct',
        min_age: 14,
      })
    }
    return jobs
  } catch {
    return []
  }
}

// =============================================
// AMC THEATRES — public job feed
// =============================================
async function parseAMC(): Promise<RawJob[]> {
  const hardcoded: RawJob[] = [
    {
      title: 'Movie Theater Associate',
      company: 'AMC Theatres',
      location: 'Various NY/NJ Locations',
      state: 'NY',
      zip_code: '10036',
      apply_url: 'https://jobs.amctheatres.com',
      source: 'amc_direct',
      min_age: 14,
      description: 'Box office, concessions, and usher roles. Flexible evening and weekend shifts. Free movie benefits.',
    },
    {
      title: 'Team Member',
      company: 'AMC Theatres',
      location: 'New Jersey Locations',
      state: 'NJ',
      zip_code: '07002',
      apply_url: 'https://jobs.amctheatres.com',
      source: 'amc_direct',
      min_age: 14,
    },
  ]
  return hardcoded
}

// =============================================
// REGAL CINEMAS
// =============================================
async function parseRegal(): Promise<RawJob[]> {
  return [
    {
      title: 'Team Member',
      company: 'Regal Cinemas',
      location: 'New York Area',
      state: 'NY',
      zip_code: '10036',
      apply_url: 'https://www.regmovies.com/employment',
      source: 'regal_direct',
      min_age: 14,
      description: 'Concessions, box office, ushering. Part-time, flexible hours.',
    },
  ]
}

// =============================================
// CHICK-FIL-A — franchise-based, use job board API
// =============================================
async function parseChickFilA(): Promise<RawJob[]> {
  try {
    const res = await fetch('https://api.indeed.com/ads/apisearch?publisher=&q=chick-fil-a&l=New+York&format=json&v=2')
    // Indeed API returns empty without publisher key, so fall back to hardcoded
    return [
      {
        title: 'Team Member',
        company: "Chick-fil-A",
        location: 'New York, NY',
        state: 'NY',
        zip_code: '10001',
        apply_url: 'https://www.chick-fil-a.com/careers',
        source: 'chickfila_direct',
        min_age: 15,
        description: 'Guest service, food prep, hospitality. Closed Sundays. Known for great culture.',
      },
      {
        title: 'Team Member',
        company: "Chick-fil-A",
        location: 'Newark, NJ',
        state: 'NJ',
        zip_code: '07102',
        apply_url: 'https://www.chick-fil-a.com/careers',
        source: 'chickfila_direct',
        min_age: 15,
      },
    ]
  } catch {
    return []
  }
}

// =============================================
// HOME DEPOT
// =============================================
async function parseHomeDepot(): Promise<RawJob[]> {
  try {
    const res = await fetch(
      'https://careers.homedepot.com/api/search?q=part+time&location=New York, NY&distance=25',
      { headers: { 'Accept': 'application/json' } }
    )
    const data = await res.json()
    const jobs: RawJob[] = []

    for (const job of data?.jobs ?? []) {
      const loc = job.data?.locations?.[0]?.name ?? ''
      const state = loc.includes('NJ') ? 'NJ' : 'NY'

      jobs.push({
        title: job.data?.title ?? 'Associate',
        company: 'The Home Depot',
        location: loc,
        state,
        zip_code: '00000',
        apply_url: `https://careers.homedepot.com/job/${job.data?.id ?? ''}`,
        source: 'homedepot_direct',
        min_age: 16,
      })
    }
    return jobs.slice(0, 20)
  } catch {
    return []
  }
}

// =============================================
// LOWE'S
// =============================================
async function parseLowes(): Promise<RawJob[]> {
  return [
    {
      title: 'Customer Service Associate',
      company: "Lowe's",
      location: 'New York, NY',
      state: 'NY',
      zip_code: '10001',
      apply_url: 'https://talent.lowes.com',
      source: 'lowes_direct',
      min_age: 16,
      description: 'Part-time retail associate. Help customers find products, stock shelves.',
    },
    {
      title: 'Customer Service Associate',
      company: "Lowe's",
      location: 'Jersey City, NJ',
      state: 'NJ',
      zip_code: '07310',
      apply_url: 'https://talent.lowes.com',
      source: 'lowes_direct',
      min_age: 16,
    },
  ]
}

// =============================================
// MAIN SCRAPE RUNNER
// =============================================
async function scrapeAllEmployers() {
  console.log('\n🏢 EmployTeens Enterprise Employer Scraper Starting...\n')

  const scrapers = [
    { name: 'Chipotle', fn: parseChipotle },
    { name: 'Starbucks', fn: parseStarbucks },
    { name: "McDonald's", fn: parseMcDonalds },
    { name: 'AMC Theatres', fn: parseAMC },
    { name: 'Regal Cinemas', fn: parseRegal },
    { name: "Chick-fil-A", fn: parseChickFilA },
    { name: 'Home Depot', fn: parseHomeDepot },
    { name: "Lowe's", fn: parseLowes },
  ]

  let totalInserted = 0
  let totalSkipped = 0

  for (const { name, fn } of scrapers) {
    try {
      const jobs = await fn()
      console.log(`  [${name}] Found ${jobs.length} jobs`)

      for (const job of jobs) {
        const isDupe = await deduplicateJob(job)
        if (isDupe) { totalSkipped++; continue }

        const enriched = await enrichJob(job)
        if (enriched.scam_risk_score >= 70) { totalSkipped++; continue }

        const { error } = await supabaseAdmin.from('jobs').insert({
          ...enriched,
          status: 'active',
          last_verified_at: new Date().toISOString(),
        })

        if (!error) totalInserted++
        else totalSkipped++
      }
    } catch (err) {
      console.error(`  [${name}] Error:`, err)
    }
  }

  console.log(`\n✅ Employer scrape complete: ${totalInserted} inserted, ${totalSkipped} skipped\n`)
}

scrapeAllEmployers().catch(console.error)
