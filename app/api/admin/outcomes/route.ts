/**
 * EMPLOYTEENS — Outcome funnel report
 *
 * The only endpoint that answers the question the product actually exists to
 * answer: are teens getting interviews and jobs?
 *
 * GET /api/admin/outcomes
 * Auth: Bearer CRON_SECRET (or ?secret= — same caveat as /api/admin/stats:
 * query-param auth leaks into logs, remove it when CRON_SECRET is rotated)
 *
 * READING THIS REPORT HONESTLY
 *
 * Every rate here is computed over REPORTED outcomes only, and each one ships
 * with the `report_rate` that produced it. If report_rate is 0.2, an 18%
 * interview rate means "18% of the fifth of teens who told us", not "18% of
 * teens". Self-selection runs hard in both directions: people who get hired
 * come back to say so, people who get ghosted stop opening the app. Treat
 * every number below as directional until report_rate clears ~0.5.
 *
 * `sample_warning` fires below MIN_TRUSTWORTHY_REPORTS. Do not put anything
 * from a warned report in front of a user, and do not feed it into ranking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isEmployerResponse, type Outcome } from '@/lib/outcomes'

/** Below this, the funnel is anecdote, not measurement. */
const MIN_TRUSTWORTHY_REPORTS = 30
/** Below this, an individual employer's numbers mean nothing. */
const MIN_EMPLOYER_REPORTS = 5

interface AppRow {
  job_id: string
  status: string
  applied_at: string | null
  outcome: Outcome | null
  outcome_checks: number | null
  outcome_reported_at: string | null
  first_response_at: string | null
  jobs: { company: string | null; source: string | null; min_age: number | null } | null
}

function rate(numerator: number, denominator: number): number | null {
  if (!denominator) return null
  return Math.round((numerator / denominator) * 1000) / 1000
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  const qsSecret = req.nextUrl.searchParams.get('secret')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && qsSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('applications')
    .select('job_id, status, applied_at, outcome, outcome_checks, outcome_reported_at, first_response_at, jobs (company, source, min_age)')
    .not('applied_at', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const apps = (data ?? []) as unknown as AppRow[]

  // ── Funnel ────────────────────────────────────────────────────────────────
  const applications = apps.length
  const reported = apps.filter((a) => a.outcome).length
  const responses = apps.filter((a) => isEmployerResponse(a.outcome)).length
  const interviews = apps.filter((a) => a.outcome === 'interview' || a.outcome === 'hired').length
  const hires = apps.filter((a) => a.outcome === 'hired').length
  const ghosted = apps.filter((a) => a.outcome === 'no_response').length

  // Prompted but silent. This is the number that tells you whether the loop
  // itself is working — if it grows faster than `reported`, the sheet is being
  // dismissed and every rate above is drifting toward the enthusiastic.
  const askedNoAnswer = apps.filter((a) => !a.outcome && (a.outcome_checks ?? 0) > 0).length
  const awaitingFirstCheck = apps.filter((a) => !a.outcome && (a.outcome_checks ?? 0) === 0).length

  const responseDays = apps
    .filter((a) => a.first_response_at && a.applied_at)
    .map((a) => (new Date(a.first_response_at!).getTime() - new Date(a.applied_at!).getTime()) / 86_400_000)
    .filter((d) => d >= 0)

  // Report lag: how long after applying the teen answered. A large lag means
  // first_response_at is a loose upper bound, so median_days_to_response
  // should be read as "no slower than".
  const reportLagDays = apps
    .filter((a) => a.outcome_reported_at && a.applied_at)
    .map((a) => (new Date(a.outcome_reported_at!).getTime() - new Date(a.applied_at!).getTime()) / 86_400_000)

  // ── Per employer ──────────────────────────────────────────────────────────
  const byEmployer = new Map<string, { applications: number; reported: number; responses: number; interviews: number; hires: number; ghosted: number }>()
  for (const a of apps) {
    const key = (a.jobs?.company ?? 'unknown').trim().toLowerCase()
    const e = byEmployer.get(key) ?? { applications: 0, reported: 0, responses: 0, interviews: 0, hires: 0, ghosted: 0 }
    e.applications++
    if (a.outcome) e.reported++
    if (isEmployerResponse(a.outcome)) e.responses++
    if (a.outcome === 'interview' || a.outcome === 'hired') e.interviews++
    if (a.outcome === 'hired') e.hires++
    if (a.outcome === 'no_response') e.ghosted++
    byEmployer.set(key, e)
  }

  const employers = [...byEmployer.entries()]
    .map(([employer, e]) => ({
      employer,
      ...e,
      response_rate: rate(e.responses, e.reported),
      interview_rate: rate(e.interviews, e.reported),
      report_rate: rate(e.reported, e.applications),
      // Hard gate. Nothing user-facing, and nothing in ranking, may consume a
      // row where this is false — see the employer trust score discussion.
      has_signal: e.reported >= MIN_EMPLOYER_REPORTS,
    }))
    .sort((a, b) => b.applications - a.applications)

  // ── By source ─────────────────────────────────────────────────────────────
  // Which ingestion channel actually produces interviews, as opposed to
  // producing listings. This is the number that should drive where sourcing
  // effort goes next.
  const bySource = new Map<string, { applications: number; reported: number; interviews: number; hires: number }>()
  for (const a of apps) {
    const key = a.jobs?.source ?? 'unknown'
    const s = bySource.get(key) ?? { applications: 0, reported: 0, interviews: 0, hires: 0 }
    s.applications++
    if (a.outcome) s.reported++
    if (a.outcome === 'interview' || a.outcome === 'hired') s.interviews++
    if (a.outcome === 'hired') s.hires++
    bySource.set(key, s)
  }

  return NextResponse.json({
    generated_at: new Date().toISOString(),

    // Read this block before any other block.
    data_quality: {
      report_rate: rate(reported, applications),
      reported,
      asked_no_answer: askedNoAnswer,
      awaiting_first_check: awaitingFirstCheck,
      median_report_lag_days: median(reportLagDays),
      sample_warning: reported < MIN_TRUSTWORTHY_REPORTS
        ? `Only ${reported} reported outcomes (need ${MIN_TRUSTWORTHY_REPORTS}+). Every rate below is anecdote. Do not ship, display, or rank on it.`
        : null,
    },

    funnel: {
      applications,
      reported,
      responses,
      interviews,
      hires,
      ghosted,
    },

    // Denominator is REPORTED outcomes, never total applications. Dividing by
    // total would silently count every unreported application as a failure.
    rates_over_reported: {
      response_rate: rate(responses, reported),
      interview_rate: rate(interviews, reported),
      hire_rate: rate(hires, reported),
      ghost_rate: rate(ghosted, reported),
    },

    timing: {
      median_days_to_response: median(responseDays),
      n: responseDays.length,
      note: 'Upper bound. first_response_at is stamped when the teen reports, not when the employer actually made contact.',
    },

    employers,
    by_source: [...bySource.entries()].map(([source, s]) => ({
      source,
      ...s,
      interview_rate: rate(s.interviews, s.reported),
      report_rate: rate(s.reported, s.applications),
    })),
  })
}
