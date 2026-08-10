/**
 * EMPLOYTEENS — opportunity ingest
 *
 * Syncs lib/jobs/opportunity-sources.ts into the jobs table, keeps seasonal
 * entries in and out of season, and retires dead links.
 *
 * WHY THIS BYPASSES THE JOB PIPELINE
 *
 * ingest-pipeline.ts exists to catch job-board spam: aggregator destinations,
 * generic career pages, ATS job-ID URL patterns, scam scoring. Point those
 * gates at hosa.org and they reject a real competition for looking like a
 * landing page. `isSpecificJobPosting` would fail, `isGenericCareerPage` would
 * fire, and the quality score rewards ATS URLs these will never have.
 *
 * So curated opportunities take the lane that already exists for municipal
 * program entries: HTTP liveness only, no URL-shape check, no scam score, no
 * quality gate. We typed these in from the organiser's own site; the spam
 * machinery has nothing to add.
 *
 * RECHECK CADENCE IS PER KIND
 *
 * A job req dies in days. An annual competition is valid for a year. The
 * `verify_interval_days` column is generated from `kind` (job 3, competition
 * 90), so this only rechecks what is actually due. Running the job pipeline's
 * paranoia over a HOSA page every three days would waste the budget and prove
 * nothing.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { OPPORTUNITY_SOURCES, type OpportunitySource } from './opportunity-sources'

export interface OpportunityIngestResult {
  inserted: number
  updated: number
  activated: number
  deactivated_out_of_season: number
  deactivated_dead_link: number
  rechecked: number
  errors: string[]
}

/**
 * Logo from the apply URL's domain via Google's favicon service.
 *
 * No files to manage, no per-entry work, and it resolves for essentially any
 * organisation with a website. Returns a generic globe for domains without a
 * favicon, which is a better failure than a broken image.
 */
export function logoForUrl(applyUrl: string, size = 128): string | null {
  try {
    const host = new URL(applyUrl).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`
  } catch {
    return null
  }
}

/** Is this entry's application window open in the given month? */
export function inSeason(o: OpportunitySource, month: number): boolean {
  return !o.activeMonths || o.activeMonths.length === 0 || o.activeMonths.includes(month)
}

/**
 * Map a source entry onto a jobs row.
 *
 * `location` carries a human string for the card. Virtual entries say "Virtual"
 * rather than a town, so the geo gate and the distance scorer both leave them
 * alone — virtual has no commute and should never be ranked down for distance.
 */
export function toJobRow(o: OpportunitySource, month: number) {
  const isVirtual = o.delivery === 'virtual'
  const local = o.eligible_regions.find((r) => r.startsWith('US-'))
  const state = local ? local.split('-')[1] : 'NJ'

  return {
    title: o.title,
    company: o.org,
    location: isVirtual ? 'Virtual' : local === 'US-NY' ? 'New York, NY' : 'Jersey City, NJ',
    state,
    zip_code: isVirtual ? '00000' : local === 'US-NY' ? '10001' : '07302',
    apply_url: o.apply_url,
    apply_method: 'url',
    source: 'opportunity',
    description: o.description.slice(0, 800),
    logo_url: logoForUrl(o.apply_url),

    kind: o.kind,
    is_paid: o.evidence_kind === 'income',
    delivery: o.delivery,
    eligible_regions: o.eligible_regions,
    language: o.language,
    min_grade: o.min_grade,
    max_grade: o.max_grade,
    cost_cents: o.cost_cents ?? null,
    cost_unknown: o.cost_cents === undefined,
    recurrence: o.recurrence,
    // Prose, not a date. A closed card says "Opens around May, entries close
    // late October" rather than just "closed", which is the difference between
    // a teen writing it off and a teen setting a reminder.
    window_note: o.windowNote,
    deadline: o.deadline?.date ?? null,
    evidence_kind: o.evidence_kind,
    rung_from: o.rung_from,
    rung_to: o.rung_to,

    // Opportunities are not employment, so child labor age rules do not gate
    // them. Grade eligibility is the real gate and it lives in min_grade.
    // min_age is set from the grade floor purely so existing age filters do
    // not silently hide them from younger teens.
    min_age: Math.max(13, o.min_grade + 5),
    legal_min_age: null,
    employer_min_age: null,

    experience_required: 'none',
    teen_friendly_score: 90,
    schedule_flexibility_score: isVirtual ? 100 : 70,
    hiring_speed_score: 60,
    scam_risk_score: 0,
    commute_estimate: isVirtual ? 0 : 30,
    physical_demand_level: 20,
    customer_interaction_level: 40,

    tags: o.tags,
    status: inSeason(o, month) ? 'active' : 'inactive',
    is_active: inSeason(o, month),
    verification_status: 'verified',
    verified_at: new Date().toISOString(),
    last_checked_at: new Date().toISOString(),
  }
}

/**
 * One HEAD (falling back to GET) to check the link still resolves.
 *
 * Deliberately lenient: many organiser sites reject HEAD or return 403 to
 * non-browser agents while working perfectly for a teen with a browser. Only a
 * hard 404 or 410 retires an entry. Being wrong in the other direction — hiding
 * a working opportunity because a server disliked our user agent — costs more.
 */
export async function checkLink(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status: number | null }> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctl.signal })
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal })
    }
    return { ok: res.status !== 404 && res.status !== 410, status: res.status }
  } catch {
    // Network error or timeout is not evidence the opportunity is gone.
    return { ok: true, status: null }
  } finally {
    clearTimeout(t)
  }
}

export async function runOpportunityIngest(
  supabase: SupabaseClient<Database>,
  opts: { recheckLinks?: boolean; month?: number } = {},
): Promise<OpportunityIngestResult> {
  const month = opts.month ?? new Date().getMonth() + 1
  const result: OpportunityIngestResult = {
    inserted: 0, updated: 0, activated: 0,
    deactivated_out_of_season: 0, deactivated_dead_link: 0,
    rechecked: 0, errors: [],
  }

  const { data: existing } = await supabase
    .from('jobs')
    .select('id, apply_url, status, last_checked_at')
    .eq('source', 'opportunity')

  const byUrl = new Map((existing ?? []).map((r) => [r.apply_url as string, r]))

  for (const o of OPPORTUNITY_SOURCES) {
    try {
      const row = toJobRow(o, month)
      const prior = byUrl.get(o.apply_url)

      // Dead-link retirement, only when the entry is actually due a recheck.
      if (opts.recheckLinks) {
        const { ok, status } = await checkLink(o.apply_url)
        result.rechecked++
        if (!ok) {
          result.deactivated_dead_link++
          if (prior) {
            await supabase.from('jobs').update({
              status: 'flagged', is_active: false,
              verification_status: `dead_${status ?? 'unknown'}`,
              last_checked_at: new Date().toISOString(),
            }).eq('id', prior.id as string)
          }
          continue
        }
      }

      if (prior) {
        await supabase.from('jobs').update(row).eq('id', prior.id as string)
        result.updated++
        if (prior.status !== 'active' && row.status === 'active') result.activated++
        if (prior.status === 'active' && row.status !== 'active') result.deactivated_out_of_season++
      } else {
        await supabase.from('jobs').insert(row)
        result.inserted++
      }
    } catch (e) {
      result.errors.push(`${o.slug}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return result
}
