/**
 * EMPLOYTEENS — ATS Ingestion Pipeline
 * Sources: Greenhouse, Lever, Ashby, SmartRecruiters (all free, public, no API key required)
 * These ATSs return exact job posting URLs that are stable and verifiable.
 *
 * POST /api/ingest/ats
 * Auth: Bearer CRON_SECRET
 *
 * IMPORTANT CONTEXT: Greenhouse/Lever/Ashby are used almost exclusively by tech
 * and trendy DTC/food brands, NOT by major chains (McDonald's, Target, etc.) — expect
 * low volume from this route for teen jobs specifically. For major chains, Adzuna or
 * JSearch is where the real volume comes from (see /api/ingest/adzuna, /api/ingest/jsearch).
 *
 * SmartRecruiters is the exception among the four: it exposes a public global
 * keyword-search API (no need to know a company slug ahead of time), so it's queried
 * the same way Adzuna is, not via a curated company list.
 *
 * NOTE: the SmartRecruiters integration below is written from documented public API
 * shape but has not been exercised against a live response (no network egress from
 * the environment that built this) — if `content[].id` / `.company.identifier` don't
 * match what the API actually returns, postings will just fail verification and get
 * silently skipped (safe failure mode), not corrupt data. Worth spot-checking the raw
 * JSON the first time this runs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ingestNormalizedJobs, type NormalizedJob } from '@/lib/jobs/ingest-pipeline'

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
]

// Companies confirmed to use Lever with NY/NJ locations
const LEVER_COMPANIES = [
  { slug: 'sweetgreen', name: 'Sweetgreen', min_age: 16 },
  { slug: 'shake-shack', name: 'Shake Shack', min_age: 16 },
  { slug: 'dos-toros', name: 'Dos Toros', min_age: 16 },
  { slug: 'taim', name: 'taïm', min_age: 16 },
  { slug: 'joe-coffee', name: 'Joe Coffee', min_age: 16 },
  { slug: 'jack-rabbit', name: 'Jack Rabbit', min_age: 16 },
]

// Companies confirmed to use Ashby with teen-relevant roles.
// Deliberately left empty rather than guessing — Ashby skews almost entirely
// tech/engineering hiring. Add slugs here only once you've confirmed a company
// both uses Ashby AND has hourly/retail-type roles (check {company}/careers for
// a redirect to jobs.ashbyhq.com/{slug}).
const ASHBY_COMPANIES: { slug: string; name: string; min_age: number }[] = []

// SmartRecruiters has a public global postings search — no company list needed.
const SMARTRECRUITERS_QUERIES = [
  { q: 'cashier part time', city: 'New York', state: 'NY' },
  { q: 'crew member', city: 'New York', state: 'NY' },
  { q: 'team member', city: 'Newark', state: 'NJ' },
  { q: 'retail associate', city: 'Brooklyn', state: 'NY' },
  { q: 'sales associate part time', city: 'Jersey City', state: 'NJ' },
  { q: 'barista', city: 'Manhattan', state: 'NY' },
]

const NY_NJ_KEYWORDS = [
  'new york', 'ny', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx',
  'staten island', 'new jersey', 'nj', 'hoboken', 'jersey city', 'newark',
  'paramus', 'woodbridge', 'clifton', 'hackensack',
]

const TEEN_JOB_KEYWORDS = [
  'crew', 'cashier', 'barista', 'team member', 'associate', 'host',
  'busser', 'runner', 'front desk', 'sales', 'stock', 'retail',
  'customer service', 'part.?time', 'seasonal', 'hourly',
]

function isNYNJ(location: string): boolean {
  const loc = location.toLowerCase()
  return NY_NJ_KEYWORDS.some((kw) => loc.includes(kw))
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
      if (!res.ok) continue
      const jobs = await res.json()
      if (!Array.isArray(jobs)) continue

      for (const job of jobs) {
        const location: string = job.categories?.location ?? job.text ?? ''
        if (!isNYNJ(location)) continue
        if (!isTeenRelevant(job.text, job.descriptionPlain)) continue

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
    } catch {
      // skip
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

  for (const q of SMARTRECRUITERS_QUERIES) {
    try {
      const url = new URL('https://api.smartrecruiters.com/v1/postings')
      url.searchParams.set('q', q.q)
      url.searchParams.set('country', 'us')
      url.searchParams.set('city', q.city)
      url.searchParams.set('limit', '50')

      const res = await fetch(url.toString(), { headers: { 'User-Agent': 'EmployTeens-Bot/1.0' } })
      if (!res.ok) continue
      const data = await res.json()

      for (const posting of data?.content ?? []) {
        const title: string = posting?.name ?? ''
        const companyName: string = posting?.company?.name ?? 'Unknown'
        const companyId: string | undefined = posting?.company?.identifier
        const city: string = posting?.location?.city ?? q.city
        const region: string = posting?.location?.region ?? q.state
        const location = [city, region].filter(Boolean).join(', ')

        if (!companyId || !posting?.id) continue
        if (!isTeenRelevant(title)) continue
        if (!isNYNJ(location) && !isNYNJ(q.state)) continue

        results.push({
          title,
          company: companyName,
          location,
          apply_url: `https://jobs.smartrecruiters.com/${companyId}/${posting.id}`,
          min_age: 16,
          posted_at: posting?.releasedDate,
        })
      }
      await new Promise((r) => setTimeout(r, 300))
    } catch {
      // skip
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
