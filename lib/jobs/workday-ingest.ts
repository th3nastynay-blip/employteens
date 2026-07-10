/**
 * EMPLOYTEENS — Workday Job Ingestion
 *
 * Workday tenants expose a public JSON API used by their own career sites:
 *   POST https://{tenant}.{wd}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
 *   body: { appliedFacets: {}, limit, offset, searchText }
 * Job URLs are https://{tenant}.{wd}.myworkdayjobs.com/en-US/{site}{externalPath}
 * — always ONE specific requisition with a native apply flow. This is direct-
 * employer application, exactly the standard the trust rules demand, and the
 * verify layer treats myworkdayjobs.com as ATS-direct (URL pattern check, no
 * flaky page fetch).
 *
 * Tenants below were confirmed via live search (wegmans, fivebelow). Wegmans
 * matters most: they hire at 15 — one of the few large employers that do.
 * A tenant that 404s just yields zero jobs; candidates are cheap.
 *
 * SCHEDULING: no free Vercel cron slot — runs daily inside clean-jobs
 * (GitHub Actions), same as the local-sources ingest.
 *
 * Lives in lib/ (route files may only export HTTP handlers); used by
 * /api/ingest/workday and the daily clean-jobs run.
 */

import { ingestNormalizedJobs, type NormalizedJob } from '@/lib/jobs/ingest-pipeline'
import { isInMarket } from '@/lib/jobs/geo'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

interface WorkdayTenant {
  tenant: string
  wd: string
  site: string
  name: string
  min_age: number
  searchTexts: string[]
}

const TENANTS: WorkdayTenant[] = [
  {
    // Confirmed live: wegmans.wd1.myworkdayjobs.com/Wegmans
    // Wegmans hires at 15 for many store roles — rare and valuable.
    tenant: 'wegmans', wd: 'wd1', site: 'Wegmans', name: 'Wegmans', min_age: 15,
    searchTexts: ['New Jersey', 'Brooklyn'],
  },
  {
    // Confirmed live: fivebelow.wd1.myworkdayjobs.com/fivebelowcareers
    tenant: 'fivebelow', wd: 'wd1', site: 'fivebelowcareers', name: 'Five Below', min_age: 16,
    searchTexts: ['New Jersey', 'New York'],
  },
  {
    // Candidate (unconfirmed tenant/site — fails safe with 0 jobs if wrong)
    tenant: 'cvshealth', wd: 'wd1', site: 'CVS_Health_Careers', name: 'CVS Health', min_age: 16,
    searchTexts: ['Jersey City NJ', 'Hoboken NJ'],
  },
]

interface WorkdayPosting {
  title?: string
  externalPath?: string
  locationsText?: string
  postedOn?: string
  bulletFields?: string[]
}

async function fetchTenantJobs(t: WorkdayTenant, searchText: string): Promise<WorkdayPosting[]> {
  const url = `https://${t.tenant}.${t.wd}.myworkdayjobs.com/wday/cxs/${t.tenant}/${t.site}/jobs`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data?.jobPostings ?? []
  } catch {
    return []
  }
}

export async function runWorkdayIngest(supabase: SupabaseClient<Database>) {
  const rawResults: NormalizedJob[] = []

  for (const t of TENANTS) {
    for (const q of t.searchTexts) {
      const postings = await fetchTenantJobs(t, q)
      for (const p of postings) {
        if (!p.title || !p.externalPath) continue
        const location = p.locationsText ?? ''
        // Workday searchText is fuzzy — enforce market geo ourselves
        if (!isInMarket(location)) continue

        rawResults.push({
          title: p.title,
          company: t.name,
          location,
          apply_url: `https://${t.tenant}.${t.wd}.myworkdayjobs.com/en-US/${t.site}${p.externalPath}`,
          description: (p.bulletFields ?? []).join(' · '),
          min_age: t.min_age,
          posted_at: undefined, // Workday returns "Posted N Days Ago" text, not a date — leave unset rather than guess
          isAggregator: false,
        })
      }
    }
  }

  return ingestNormalizedJobs(supabase, 'workday', rawResults)
}
