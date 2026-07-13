/**
 * EMPLOYTEENS — McDonald's DirectEmployers ingestion
 *
 * mcdonalds.dejobs.org is McDonald's own branded job site on the
 * DirectEmployers network: server-rendered HTML, ~900 NJ postings, state-
 * indexed, with franchise apply flows behind "Apply Now". Crucially it
 * carries the rare REAL 14/15 postings ("Crew Team Member - 14/15 Years
 * Old") that no ATS API exposes. Discovered 2026-07-13 while chasing 14/15
 * supply — McDonald's is the largest teen employer in America and this is
 * their direct pipe.
 *
 * Index pages parsed with a tolerant regex (job links end in /{hex}/job/).
 * Every candidate still goes through the full verification pipeline —
 * the posting page is static HTML, so liveness/content/apply checks all
 * genuinely run.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { ingestNormalizedJobs, type NormalizedJob } from '@/lib/jobs/ingest-pipeline'
import { isTeenAppropriateTitle } from '@/lib/jobs/teen-scoring'
import { isInMarket } from '@/lib/jobs/geo'

const STATE_PAGES = [
  { slug: 'new-jersey', state: 'NJ' as const, pages: 3 },
  { slug: 'new-york', state: 'NY' as const, pages: 2 },
]

const MAX_CANDIDATES = 80

interface DejobsCandidate {
  title: string
  url: string
  citySlug: string
  state: 'NJ' | 'NY'
}

/** "bayonne-nj" → "Bayonne", "west-new-york-nj" → "West New York" */
function cityFromSlug(slug: string): string {
  return slug
    .replace(/-(nj|ny)$/i, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

async function fetchIndexPage(stateSlug: string, page: number): Promise<string> {
  const url = `https://mcdonalds.dejobs.org/locations/${stateSlug}/jobs/${page > 1 ? `?page=${page}` : ''}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
    })
    if (!res.ok) return ''
    return await res.text()
  } catch {
    return ''
  }
}

function parseIndex(html: string, state: 'NJ' | 'NY'): DejobsCandidate[] {
  const out: DejobsCandidate[] = []
  // Job links look like: href="/bayonne-nj/crew-team-member/4004ABCD.../job/"
  const re = /href="\/([a-z0-9-]+)\/([a-z0-9-]+)\/([A-F0-9]{16,})\/job\/"[^>]*>([^<]{3,120})</gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const [, citySlug, , , rawTitle] = m
    const title = rawTitle.trim()
    if (!title) continue
    out.push({
      title,
      url: `https://mcdonalds.dejobs.org/${m[1]}/${m[2]}/${m[3]}/job/`,
      citySlug,
      state,
    })
  }
  return out
}

export async function runDejobsIngest(supabase: SupabaseClient<Database>) {
  const candidates: DejobsCandidate[] = []

  for (const sp of STATE_PAGES) {
    for (let page = 1; page <= sp.pages; page++) {
      const html = await fetchIndexPage(sp.slug, page)
      if (!html) break
      candidates.push(...parseIndex(html, sp.state))
    }
  }

  // Dedupe by URL, then gate cheaply BEFORE any posting-page fetch
  const seen = new Set<string>()
  const normalized: NormalizedJob[] = []

  for (const c of candidates) {
    if (seen.has(c.url)) continue
    seen.add(c.url)
    if (normalized.length >= MAX_CANDIDATES) break

    const city = cityFromSlug(c.citySlug)
    const location = `${city}, ${c.state}`
    const is1415 = /14\s*[/&-]?\s*15|minimum age 14/i.test(c.title)

    // Teen gate + overnight guard (not in the general adult-role list)
    if (!isTeenAppropriateTitle(c.title) || /overnight/i.test(c.title)) continue
    // Geography: in-market cities only — EXCEPT true 14/15 postings, which
    // are rare enough to carry statewide (the distance engine ranks them
    // honestly; a Hudson 14-year-old sees real miles, not a lie)
    if (!is1415 && !isInMarket(location)) continue

    normalized.push({
      title: c.title,
      company: "McDonald's",
      location,
      state: c.state,
      apply_url: c.url,
      description: '',
      // 14/15-titled postings state their floor; everything else uses the
      // conservative NJ/NY McDonald's default of 16
      min_age: is1415 ? 14 : 16,
      isAggregator: false,
    })
  }

  return ingestNormalizedJobs(supabase, 'dejobs', normalized)
}
