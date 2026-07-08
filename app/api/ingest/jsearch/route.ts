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

// Hobby plan caps functions at 10s by default; 60s is the max Hobby allows.
export const maxDuration = 60

// Keep this list short — each entry costs one request against JSearch's quota.
const QUERIES = [
  { text: 'cashier jobs in New York, NY', state: 'NY' },
  { text: 'crew member jobs in New York, NY', state: 'NY' },
  { text: 'part time retail associate jobs in Brooklyn, NY', state: 'NY' },
  { text: 'team member jobs in Newark, NJ', state: 'NJ' },
  { text: 'barista jobs in Jersey City, NJ', state: 'NJ' },
  { text: 'entry level part time jobs in Queens, NY', state: 'NY' },
]

interface JSearchResult {
  job_id?: string
  job_title?: string
  employer_name?: string
  job_apply_link?: string
  job_description?: string
  job_city?: string
  job_state?: string
  job_posted_at_datetime_utc?: string
  job_employment_type?: string
  job_min_salary?: number | null
  job_max_salary?: number | null
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
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
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
          if (!r.job_apply_link || !r.job_title || !r.employer_name) continue
          // job_state is a full name ("Illinois"), not our two-letter format —
          // use it only for the human-readable location string, never for `state`
          const location = [r.job_city, r.job_state].filter(Boolean).join(', ')

          rawResults.push({
            title: r.job_title,
            company: r.employer_name,
            location: location || q.state,
            state: q.state,
            apply_url: r.job_apply_link,
            description: r.job_description ?? '',
            posted_at: r.job_posted_at_datetime_utc,
            job_type: r.job_employment_type,
            salary_min: r.job_min_salary ?? undefined,
            salary_max: r.job_max_salary ?? undefined,
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

  return NextResponse.json({ success: true, ...stats })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
