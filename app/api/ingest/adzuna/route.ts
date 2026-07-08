/**
 * EMPLOYTEENS — Adzuna Job Ingestion
 * Adzuna returns specific job posting URLs for major retail/food chains.
 * This is the primary source for McDonald's, Target, Chipotle, AMC, etc.
 *
 * Setup (free): https://developer.adzuna.com/
 * Env vars needed:
 *   ADZUNA_APP_ID — from developer.adzuna.com
 *   ADZUNA_APP_KEY — from developer.adzuna.com
 *
 * POST /api/ingest/adzuna
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ingestNormalizedJobs, type NormalizedJob } from '@/lib/jobs/ingest-pipeline'

// Hobby plan caps functions at 10s by default; 60s is the max Hobby allows.
// This does 26 Adzuna queries (concurrency-limited, see below) plus per-job
// verification (also concurrency-limited in ingest-pipeline.ts), so it needs
// the extra room even on a free plan.
export const maxDuration = 60

// Teen-friendly search queries for NY/NJ
const SEARCH_QUERIES = [
  { q: 'crew member part time', where: 'New York', state: 'NY' },
  { q: 'cashier entry level', where: 'New York', state: 'NY' },
  { q: 'team member no experience', where: 'New York', state: 'NY' },
  { q: 'barista part time', where: 'New York', state: 'NY' },
  { q: 'sales associate part time', where: 'New York', state: 'NY' },
  { q: 'crew member part time', where: 'New Jersey', state: 'NJ' },
  { q: 'cashier entry level', where: 'New Jersey', state: 'NJ' },
  { q: 'team member no experience', where: 'New Jersey', state: 'NJ' },
  { q: 'food service part time 16', where: 'New York', state: 'NY' },
  { q: 'retail associate high school', where: 'New York', state: 'NY' },
]

// Company-specific searches for major teen employers
const COMPANY_SEARCHES = [
  { company: 'McDonald\'s', state: 'NY' },
  { company: 'McDonald\'s', state: 'NJ' },
  { company: 'Chipotle', state: 'NY' },
  { company: 'Chipotle', state: 'NJ' },
  { company: 'Starbucks', state: 'NY' },
  { company: 'Target', state: 'NY' },
  { company: 'Target', state: 'NJ' },
  { company: 'AMC Theatres', state: 'NY' },
  { company: 'AMC Theatres', state: 'NJ' },
  { company: 'Five Below', state: 'NY' },
  { company: 'Shake Shack', state: 'NY' },
  { company: 'Dunkin', state: 'NY' },
  { company: 'Subway', state: 'NY' },
  { company: 'Burger King', state: 'NJ' },
  { company: 'Wendy\'s', state: 'NJ' },
  { company: 'Planet Fitness', state: 'NY' },
]

interface AdzunaResult {
  id: string
  title: string
  company: { display_name?: string } | null
  location: { display_name?: string; area?: string[] } | null
  redirect_url: string
  description: string
  created: string
}

async function fetchAdzunaPage(
  appId: string,
  appKey: string,
  query: string,
  location: string,
  page: number = 1,
): Promise<AdzunaResult[]> {
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/us/search/${page}`)
  url.searchParams.set('app_id', appId)
  url.searchParams.set('app_key', appKey)
  url.searchParams.set('what', query)
  url.searchParams.set('where', location)
  url.searchParams.set('results_per_page', '50')
  url.searchParams.set('content-type', 'application/json')
  url.searchParams.set('sort_by', 'date')
  // Only show jobs from last 30 days
  url.searchParams.set('max_days_old', '30')

  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = await res.json()
  return data?.results ?? []
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appId = process.env.ADZUNA_APP_ID
  const appKey = process.env.ADZUNA_APP_KEY

  if (!appId || !appKey) {
    return NextResponse.json({
      error: 'Adzuna API keys not configured',
      setup: 'Get free keys at https://developer.adzuna.com/ and add ADZUNA_APP_ID and ADZUNA_APP_KEY to Vercel env vars',
    }, { status: 503 })
  }

  // Re-bind to plain `string` locals — TS doesn't carry the null-check
  // narrowing above into the nested fetchWorker() function declaration below.
  const verifiedAppId: string = appId
  const verifiedAppKey: string = appKey

  const supabase = await createAdminClient()

  // 26 total queries (10 keyword + 16 company). Run with limited concurrency
  // instead of one at a time with a delay after each — sequential took long
  // enough on its own (before verification even started) to contribute to a
  // production FUNCTION_INVOCATION_TIMEOUT. Concurrency of 4 cuts total wall
  // time roughly 4x while still being reasonably polite to Adzuna's API.
  type QuerySpec = { q: string; where: string; state: string }
  const allQueries: QuerySpec[] = [
    ...SEARCH_QUERIES,
    ...COMPANY_SEARCHES.map((c) => ({
      q: c.company,
      where: c.state === 'NY' ? 'New York' : 'New Jersey',
      state: c.state,
    })),
  ]

  const rawResults: NormalizedJob[] = []
  const queue = [...allQueries]

  async function fetchWorker() {
    while (queue.length > 0) {
      const q = queue.shift()
      if (!q) break
      try {
        const results = await fetchAdzunaPage(verifiedAppId, verifiedAppKey, q.q, q.where)
        for (const r of results) {
          if (!r.redirect_url) continue
          rawResults.push({
            title: r.title,
            company: r.company?.display_name ?? q.q,
            location: r.location?.display_name ?? q.where,
            apply_url: r.redirect_url,
            description: r.description ?? '',
            posted_at: r.created,
            state: q.state,
            isAggregator: true,
          })
        }
      } catch {
        // Skip failed queries — don't let one bad query kill the whole run
      }
      await new Promise((res) => setTimeout(res, 150))
    }
  }

  await Promise.all(Array.from({ length: 4 }, fetchWorker))

  const stats = await ingestNormalizedJobs(supabase, 'adzuna', rawResults)

  return NextResponse.json({ success: true, ...stats })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
