/**
 * EMPLOYTEENS — ATS Ingestion Pipeline
 * Sources: Greenhouse, Lever, Ashby, SmartRecruiters (all free, public, no API key required)
 * These ATSs return exact job posting URLs that are stable and verifiable.
 *
 * POST /api/ingest/ats
 * Auth: Bearer CRON_SECRET
 *
 * IMPORTANT CONTEXT: Greenhouse/Lever/Ashby/SmartRecruiters are used almost
 * exclusively by tech and trendy DTC/food brands, NOT by major chains
 * (McDonald's, Target, etc.) — expect low volume from this route for teen jobs
 * specifically. For major chains, Adzuna or JSearch is where the real volume
 * comes from (see /api/ingest/adzuna, /api/ingest/jsearch).
 *
 * STATUS AS OF 2026-07-08, confirmed against live production runs + web search
 * for real posting URLs, not guesses:
 *   - Greenhouse: WORKING. Real jobs confirmed inserted (sweetgreen and others
 *     returned live postings).
 *   - Lever: the original 6 hardcoded company slugs returned HTTP 404 in
 *     production — 100% failure rate, meaning that list was never verified
 *     against real data before being written. Replaced with 4 companies
 *     confirmed via web search to have real, live postings on Lever right now
 *     (see comment above LEVER_COMPANIES for sourcing per company).
 *   - SmartRecruiters: originally called a global `/v1/postings` search
 *     endpoint that also 404'd in production — that endpoint doesn't exist
 *     publicly the way I'd assumed. Switched to the per-company endpoint
 *     (`/v1/companies/{id}/postings`, matching what the older, now-deleted
 *     workers/ingest-apis.ts used) and populated with 2 companies confirmed
 *     via web search (see comment above SMARTRECRUITERS_COMPANIES).
 *
 * None of this has been re-run against production since these changes — the
 * next /api/ingest/ats call is the real test of whether these hold up.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ingestNormalizedJobs, type NormalizedJob } from '@/lib/jobs/ingest-pipeline'
import { isInMarket } from '@/lib/jobs/geo'

// Hobby plan caps functions at 10s by default; 60s is the max Hobby allows.
// Four sources looping through company lists plus per-job verification will
// exceed the default easily, even on a free plan.
export const maxDuration = 60

// Companies confirmed to use Greenhouse with NY/NJ locations and teen-friendly roles
const GREENHOUSE_COMPANIES = [
  // Food & Beverage
  { slug: 'sweetgreen', name: 'Sweetgreen', min_age: 16 },
  { slug: 'dig', name: 'Dig', min_age: 16 },
  { slug: 'andpizza', name: '&pizza', min_age: 16 },
  { slug: 'juicepress', name: 'Juice Press', min_age: 16 },
  { slug: 'freshco', name: 'FreshCo', min_age: 16 },
  { slug: 'by-chloe', name: 'by CHLOE', min_age: 16 },
  { slug: 'sakara', name: 'Sakara Life', min_age: 16 },
  { slug: 'blue-bottle-coffee', name: 'Blue Bottle Coffee', min_age: 16 },
  { slug: 'gregorys-coffee', name: "Gregory's Coffee", min_age: 16 },
  { slug: 'cafe-grumpy', name: 'Cafe Grumpy', min_age: 16 },
  // Retail
  { slug: 'warbyparker', name: 'Warby Parker', min_age: 16 },
  { slug: 'allbirds', name: 'Allbirds', min_age: 16 },
  { slug: 'glossier', name: 'Glossier', min_age: 16 },
  { slug: 'untuckit', name: 'UNTUCKit', min_age: 16 },
  { slug: 'vineyard-vines', name: 'Vineyard Vines', min_age: 16 },
  // Fitness
  { slug: 'classpass', name: 'ClassPass', min_age: 16 },
  { slug: 'soulcycle', name: 'SoulCycle', min_age: 16 },
  { slug: 'barry-s-bootcamp', name: "Barry's Bootcamp", min_age: 18 },
  // Candidate slugs added 2026-07-09 — teen-relevant chains with NY/NJ
  // presence. Unconfirmed slugs fail safe: a 404 board yields zero jobs and
  // costs one fetch. Anything that resolves goes through full verification.
  { slug: 'playabowls', name: 'Playa Bowls', min_age: 16 },
  { slug: 'vanleeuwenicecream', name: 'Van Leeuwen Ice Cream', min_age: 16 },
  { slug: 'levainbakery', name: 'Levain Bakery', min_age: 16 },
  { slug: 'bluestonelane', name: 'Bluestone Lane', min_age: 16 },
  { slug: 'magnoliabakery', name: 'Magnolia Bakery', min_age: 16 },
  { slug: 'pressedjuicery', name: 'Pressed Juicery', min_age: 16 },
  { slug: 'chopt', name: 'Chopt Creative Salad', min_age: 16 },
  { slug: 'justsaladcareers', name: 'Just Salad', min_age: 16 },
]

// Rebuilt 2026-07-08 after the original 6 slugs (sweetgreen, shake-shack,
// dos-toros, taim, joe-coffee, jack-rabbit) all 404'd in production — that
// list was a guess, never checked against real data. These replacements were
// found via live web search returning actual current job posting URLs on
// jobs.lever.co, not guessed:
//   - bluebottlecoffee: confirmed barista/cafe-leader postings in NYC and
//     Paramus, NJ (note: no hyphens in the slug — "blue-bottle-coffee" was
//     also wrong before)
//   - thuma: confirmed "Lead Barista" at their NYC SoHo flagship
//   - boxlunch: BoxLunch/Hot Topic, a national mall retailer — board exists
//     and is a classic teen-hiring chain, though NY/NJ-specific postings
//     weren't individually confirmed in search results (national chain,
//     high confidence they have East Coast mall locations)
//   - gopuff: confirmed a NY-based in-store Starbucks staffing role
const LEVER_COMPANIES = [
  { slug: 'bluebottlecoffee', name: 'Blue Bottle Coffee', min_age: 16 },
  { slug: 'thuma', name: 'Thuma', min_age: 16 },
  { slug: 'boxlunch', name: 'BoxLunch / Hot Topic', min_age: 16 },
  { slug: 'gopuff', name: 'Gopuff', min_age: 16 },
  // Confirmed live 2026-07-09 via api.lever.co probe — Cookie Crew roles,
  // NYC/Hoboken stores, classic teen employer
  { slug: 'insomniacookies', name: 'Insomnia Cookies', min_age: 16 },
]

// Companies confirmed to use Ashby with teen-relevant roles.
// Deliberately left empty rather than guessing — Ashby skews almost entirely
// tech/engineering hiring. Add slugs here only once you've confirmed a company
// both uses Ashby AND has hourly/retail-type roles (check {company}/careers for
// a redirect to jobs.ashbyhq.com/{slug}).
const ASHBY_COMPANIES: { slug: string; name: string; min_age: number }[] = []

// Corrected 2026-07-08 — the global `/v1/postings?q=` search endpoint I
// originally wrote here returned HTTP 404 in production across all 6 queries.
// SmartRecruiters doesn't expose that publicly the way I'd assumed. Switched
// to the per-company endpoint pattern instead (same shape Greenhouse/Lever
// use), matching what the older, now-deleted workers/ingest-apis.ts used.
// Found via live web search returning actual current job posting URLs on
// jobs.smartrecruiters.com, not guessed:
//   - Eataly: confirmed cashier/front-end associate postings at their NYC
//     Flatiron location
//   - CityOfNewYork: confirmed cashier and customer-service postings in NYC
//     and the Bronx — set to min_age 18, municipal roles commonly require it
const SMARTRECRUITERS_COMPANIES = [
  { identifier: 'Eataly', name: 'Eataly', min_age: 16 },
  { identifier: 'CityOfNewYork', name: 'City of New York', min_age: 18 },
]

const TEEN_JOB_KEYWORDS = [
  'crew', 'cashier', 'barista', 'team member', 'associate', 'host',
  'busser', 'runner', 'front desk', 'sales', 'stock', 'retail',
  'customer service', 'part.?time', 'seasonal', 'hourly',
]

// Word-boundary market check (lib/jobs/geo.ts). The old bare-substring
// version matched 'ny' inside "Sunnyvale" and 'manhattan' inside
// "Manhattan Beach, CA" — California jobs were shipping to NJ teens.
function isNYNJ(location: string): boolean {
  return isInMarket(location)
}

function isTeenRelevant(title: string, description?: string): boolean {
  const text = `${title} ${description ?? ''}`.toLowerCase()
  return TEEN_JOB_KEYWORDS.some((kw) => new RegExp(kw, 'i').test(text))
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// ── Greenhouse ─────────────────────────────────────────────────────────────
async function fetchGreenhouse(): Promise<NormalizedJob[]> {
  const results: NormalizedJob[] = []

  for (const company of GREENHOUSE_COMPANIES) {
    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs?content=true`,
        { headers: { 'User-Agent': 'EmployTeens-Bot/1.0' } }
      )
      if (!res.ok) continue
      const data = await res.json()

      for (const job of data?.jobs ?? []) {
        const location: string = job.location?.name ?? ''
        if (!isNYNJ(location)) continue
        if (!isTeenRelevant(job.title, job.content)) continue

        results.push({
          title: job.title,
          company: company.name,
          location,
          apply_url: job.absolute_url,
          description: stripHtml(job.content ?? '').slice(0, 800),
          min_age: company.min_age,
          posted_at: job.updated_at,
        })
      }
    } catch {
      // Company not on Greenhouse or board not found — skip
    }
    await new Promise((r) => setTimeout(r, 200))
  }

  return results
}

// ── Lever ──────────────────────────────────────────────────────────────────
async function fetchLever(): Promise<NormalizedJob[]> {
  const results: NormalizedJob[] = []

  for (const company of LEVER_COMPANIES) {
    try {
      const res = await fetch(
        `https://api.lever.co/v0/postings/${company.slug}?mode=json`,
        { headers: { 'User-Agent': 'EmployTeens-Bot/1.0' } }
      )
      if (!res.ok) {
        console.log(`[ats/lever] ${company.slug}: HTTP ${res.status} — company likely no longer on Lever or slug is wrong`)
        continue
      }
      const jobs = await res.json()
      if (!Array.isArray(jobs)) {
        console.log(`[ats/lever] ${company.slug}: response was not an array, got`, typeof jobs)
        continue
      }

      let matched = 0
      for (const job of jobs) {
        const location: string = job.categories?.location ?? job.text ?? ''
        if (!isNYNJ(location)) continue
        if (!isTeenRelevant(job.text, job.descriptionPlain)) continue
        matched++

        results.push({
          title: job.text,
          company: company.name,
          location,
          apply_url: job.hostedUrl,
          description: (job.descriptionPlain ?? '').slice(0, 800),
          min_age: company.min_age,
          posted_at: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
        })
      }
      console.log(`[ats/lever] ${company.slug}: ${jobs.length} postings found, ${matched} matched NY/NJ + teen-relevant filters`)
    } catch (err) {
      console.log(`[ats/lever] ${company.slug}: fetch threw`, String(err).slice(0, 200))
    }
    await new Promise((r) => setTimeout(r, 200))
  }

  return results
}

// ── Ashby ──────────────────────────────────────────────────────────────────
async function fetchAshby(): Promise<NormalizedJob[]> {
  const results: NormalizedJob[] = []

  for (const company of ASHBY_COMPANIES) {
    try {
      const res = await fetch(
        `https://api.ashbyhq.com/posting-api/job-board/${company.slug}`,
        { headers: { 'User-Agent': 'EmployTeens-Bot/1.0' } }
      )
      if (!res.ok) continue
      const data = await res.json()

      for (const job of data?.jobPostings ?? []) {
        const location: string = job.locationName ?? ''
        if (!isNYNJ(location)) continue
        if (!isTeenRelevant(job.title)) continue

        results.push({
          title: job.title,
          company: company.name,
          location,
          apply_url: job.jobUrl ?? job.applyUrl,
          description: (job.descriptionHtml ? stripHtml(job.descriptionHtml) : '').slice(0, 800),
          min_age: company.min_age,
        })
      }
    } catch {
      // skip
    }
  }

  return results
}

// ── SmartRecruiters ──────────────────────────────────────────────────────────
async function fetchSmartRecruiters(): Promise<NormalizedJob[]> {
  const results: NormalizedJob[] = []

  for (const company of SMARTRECRUITERS_COMPANIES) {
    try {
      const url = new URL(`https://api.smartrecruiters.com/v1/companies/${company.identifier}/postings`)
      url.searchParams.set('limit', '50')

      const res = await fetch(url.toString(), { headers: { 'User-Agent': 'EmployTeens-Bot/1.0' } })
      if (!res.ok) {
        console.log(`[ats/smartrecruiters] ${company.identifier}: HTTP ${res.status} — company likely not on SmartRecruiters or identifier is wrong`)
        continue
      }
      const data = await res.json()
      const postings = data?.content ?? []
      console.log(`[ats/smartrecruiters] ${company.identifier}: ${postings.length} postings found`)

      let matched = 0
      for (const posting of postings) {
        const title: string = posting?.name ?? ''
        const city: string = posting?.location?.city ?? ''
        const region: string = posting?.location?.region ?? ''
        const location = [city, region].filter(Boolean).join(', ')

        if (!posting?.id) continue
        if (!isTeenRelevant(title)) continue
        if (!isNYNJ(location)) continue
        matched++

        results.push({
          title,
          company: company.name,
          location,
          apply_url: `https://jobs.smartrecruiters.com/${company.identifier}/${posting.id}`,
          min_age: company.min_age,
          posted_at: posting?.releasedDate,
        })
      }
      console.log(`[ats/smartrecruiters] ${company.identifier}: ${matched} matched NY/NJ + teen-relevant filters`)
      await new Promise((r) => setTimeout(r, 300))
    } catch (err) {
      console.log(`[ats/smartrecruiters] ${company.identifier} threw`, String(err).slice(0, 200))
    }
  }

  return results
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  const [ghJobs, leverJobs, ashbyJobs, smartRecruitersJobs] = await Promise.all([
    fetchGreenhouse(),
    fetchLever(),
    fetchAshby(),
    fetchSmartRecruiters(),
  ])

  const results = await Promise.all([
    ingestNormalizedJobs(supabase, 'greenhouse', ghJobs),
    ingestNormalizedJobs(supabase, 'lever', leverJobs),
    ingestNormalizedJobs(supabase, 'ashby', ashbyJobs),
    ingestNormalizedJobs(supabase, 'smartrecruiters', smartRecruitersJobs),
  ])

  return NextResponse.json({
    success: true,
    greenhouse: results[0],
    lever: results[1],
    ashby: results[2],
    smartrecruiters: results[3],
  })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
