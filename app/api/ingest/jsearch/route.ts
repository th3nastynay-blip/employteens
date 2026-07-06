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
 * NOTE: this integration is written against JSearch's documented response
 * shape but has not been exercised against a live response (no network egress
 * from the environment that built this). If field names have drifted, postings
 * will just fail to parse and get skipped — not a data-integrity risk, just
 * lower yield. Worth spot-checking the raw JSON the first time this runs.
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
  const url = new URL('https://jsearch.p.rapidapi.com/search')
  url.searchParams.set('query', query)
  url.searchParams.set('page', '1')
  url.searchParams.set('num_pages', '1')
  url.searchParams.set('date_posted', 'week')

  const res = await fetch(url.toString(), {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data?.data ?? []
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

  const supabase = await createAdminClient()
  const rawResults: NormalizedJob[] = []

  for (const q of QUERIES) {
    try {
      const results = await fetchJSearchPage(apiKey, q.text)
      for (const r of results) {
        if (!r.job_apply_link || !r.job_title || !r.employer_name) continue
        const location = [r.job_city, r.job_state ?? q.state].filter(Boolean).join(', ')

        rawResults.push({
          title: r.job_title,
          company: r.employer_name,
          location: location || q.state,
          state: r.job_state ?? q.state,
          apply_url: r.job_apply_link,
          description: r.job_description ?? '',
          posted_at: r.job_posted_at_datetime_utc,
          job_type: r.job_employment_type,
          salary_min: r.job_min_salary ?? undefined,
          salary_max: r.job_max_salary ?? undefined,
          isAggregator: true,
        })
      }
      await new Promise((res) => setTimeout(res, 300))
    } catch {
      // Skip failed queries — don't let one bad query kill the whole run
    }
  }

  const stats = await ingestNormalizedJobs(supabase, 'jsearch', rawResults)

  return NextResponse.json({ success: true, ...stats })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
