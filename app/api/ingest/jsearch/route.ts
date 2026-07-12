/**
 * EMPLOYTEENS — JSearch Job Ingestion
 * JSearch (RapidAPI) aggregates listings from Google for Jobs — which itself
 * pulls from Indeed, ZipRecruiter, LinkedIn, and thousands of employer career
 * sites. This is the highest-volume source available for teen/entry-level
 * retail & food-service roles (Adzuna is the other major aggregator; Greenhouse/
 * Lever/Ashby/SmartRecruiters skew corporate/tech and won't have much of this).
 *
 * Setup: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 *   1. Subscribe to the free "Basic" plan (small monthly quota — keep the
 *      query list below short, each query = 1 request against that quota)
 *   2. Copy your RapidAPI key
 * Env var needed:
 *   JSEARCH_API_KEY
 *
 * NOTE: full request + response shape confirmed against a live /search-v2
 * response on 2026-07-08. Two things worth knowing for future maintenance:
 *   1. The array is nested at data.data.jobs, not data.data — v2 wraps the
 *      results in an object alongside a `cursor` field for pagination
 *      (replaces the old page-number param, which is why there's no `page`
 *      param in the request below).
 *   2. `job_state` comes back as a full name ("Illinois"), not the two-letter
 *      code the rest of this schema uses ("NY"/"NJ") — so the `state` field
 *      always uses the query's own target state (q.state) rather than
 *      trusting the API's value, since every query here already targets a
 *      specific NY/NJ location.
 *
 * POST /api/ingest/jsearch
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ingestNormalizedJobs, type NormalizedJob } from '@/lib/jobs/ingest-pipeline'
import { isTrustedDestination } from '@/lib/jobs/verify-url'

// Hobby plan caps functions at 10s by default; 60s is the max Hobby allows.
export const maxDuration = 60

// Keep this list short — each entry costs one request against JSearch's quota.
// SMB-focused 2026-07-12: Google Jobs indexes the ATSs small businesses
// actually use (Workstream, Harri, McHire, Homebase) — these queries target
// the restaurant/shop roles where SMBs hire teens, Hudson County first.
const QUERIES = [
  { text: 'restaurant crew team member jobs in Jersey City, NJ', state: 'NJ' },
  { text: 'ice cream frozen yogurt shop jobs in Hoboken, NJ', state: 'NJ' },
  { text: 'barista cafe coffee shop jobs in Jersey City, NJ', state: 'NJ' },
  { text: 'bagel shop deli jobs in North Bergen, NJ', state: 'NJ' },
  { text: 'pizzeria restaurant jobs in Union City, NJ', state: 'NJ' },
  { text: 'part time cashier jobs in Bayonne, NJ', state: 'NJ' },
  { text: 'juice bar smoothie shop jobs in New York, NY', state: 'NY' },
  { text: 'restaurant team member jobs in New York, NY', state: 'NY' },
]

interface JSearchApplyOption {
  publisher?: string
  apply_link?: string
  is_direct?: boolean
}

interface JSearchResult {
  job_id?: string
  job_title?: string
  employer_name?: string
  job_apply_link?: string
  /** Alternative apply destinations — often includes the DIRECT employer/ATS link */
  apply_options?: JSearchApplyOption[]
  job_description?: string
  job_city?: string
  job_state?: string
  job_posted_at_datetime_utc?: string
  job_employment_type?: string
  job_min_salary?: number | null
  job_max_salary?: number | null
}

/**
 * Google Jobs postings list every place a job can be applied to. Most are
 * aggregators (LinkedIn, ZipRecruiter) that our rules reject — but SMB
 * postings routinely include the employer's own ATS link (Workstream,
 * Harri, McHire, Homebase) in apply_options. Picking the first TRUSTED
 * destination instead of blindly taking job_apply_link turns JSearch from
 * 90% rejects into a small-business discovery engine.
 */
function pickTrustedApplyLink(r: JSearchResult): string | null {
  const company = r.employer_name ?? ''
  const candidates = [
    ...(r.apply_options ?? []).filter((o) => o.is_direct).map((o) => o.apply_link),
    r.job_apply_link,
    ...(r.apply_options ?? []).filter((o) => !o.is_direct).map((o) => o.apply_link),
  ].filter((u): u is string => !!u)

  for (const url of candidates) {
    if (isTrustedDestination(url, company)) return url
  }
  return null
}

async function fetchJSearchPage(apiKey: string, query: string): Promise<JSearchResult[]> {
  const url = new URL('https://jsearch.p.rapidapi.com/search-v2')
  url.searchParams.set('query', query)
  url.searchParams.set('num_pages', '1')
  url.searchParams.set('country', 'us')
  url.searchParams.set('date_posted', 'week')

  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'jsearch.p.rapidapi.com',
    },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data?.data?.jobs ?? []
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  const qsSecret = req.nextUrl.searchParams.get('secret')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && qsSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.JSEARCH_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      error: 'JSearch API key not configured',
      setup: 'Subscribe to the free plan at https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch and add JSEARCH_API_KEY to Vercel env vars',
    }, { status: 503 })
  }

  // Re-bind to a plain `string` local — TS doesn't carry the null-check
  // narrowing above into the nested fetchWorker() function declaration below.
  const verifiedApiKey: string = apiKey

  const supabase = await createAdminClient()
  const rawResults: NormalizedJob[] = []
  let skippedNoDirectLink = 0

  // JSearch's own reported latency is ~10 seconds PER REQUEST (visible on its
  // RapidAPI console) — 6 queries run sequentially would be ~60s on their own,
  // before verification even starts, which is exactly what caused a
  // FUNCTION_INVOCATION_TIMEOUT in production. Running them concurrently
  // instead keeps total wall time close to one request's latency, not six.
  const queue = [...QUERIES]

  async function fetchWorker() {
    while (queue.length > 0) {
      const q = queue.shift()
      if (!q) break
      try {
        const results = await fetchJSearchPage(verifiedApiKey, q.text)
        for (const r of results) {
          if (!r.job_title || !r.employer_name) continue

          // Only ingest postings with a trusted direct destination — saves
          // the verification budget for links that can actually pass.
          const applyUrl = pickTrustedApplyLink(r)
          if (!applyUrl) {
            skippedNoDirectLink++
            continue
          }

          // job_state is a full name ("Illinois"), not our two-letter format —
          // use it only for the human-readable location string, never for `state`
          const location = [r.job_city, r.job_state].filter(Boolean).join(', ')

          rawResults.push({
            title: r.job_title,
            company: r.employer_name,
            location: location || q.state,
            state: q.state,
            apply_url: applyUrl,
            description: r.job_description ?? '',
            posted_at: r.job_posted_at_datetime_utc,
            job_type: r.job_employment_type,
            salary_min: r.job_min_salary ?? undefined,
            salary_max: r.job_max_salary ?? undefined,
            // Metadata comes from Google's index, not the destination page —
            // keep content-matching on
            isAggregator: true,
          })
        }
      } catch {
        // Skip failed queries — don't let one bad query kill the whole run
      }
    }
  }

  await Promise.all(Array.from({ length: 4 }, fetchWorker))

  const stats = await ingestNormalizedJobs(supabase, 'jsearch', rawResults)

  return NextResponse.json({ success: true, skipped_no_direct_link: skippedNoDirectLink, ...stats })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
