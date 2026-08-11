/**
 * EMPLOYTEENS — curated opportunities: competitions, programs, volunteering
 *
 * EMPTY ON PURPOSE. The previous 42 entries were cleared on 2026-08-10 because
 * the founder is supplying a hand-picked list instead. The rules below survived
 * the reset because they are the spec every new entry has to meet, and most of
 * them exist because we watched a competitor break them.
 *
 * ── 1. NO INVENTED DEADLINES ─────────────────────────────────────────────
 *
 * Checked congressionalappchallenge.us on 2026-08-10: their student page still
 * advertised "The 2025 Congressional App Challenge launched on May 1st, 2025.
 * Students can enter through October 30th, 2025." In August 2026. The
 * organiser's own site was a year stale.
 *
 * So `windowNote` carries the recurring PATTERN in plain English ("opens around
 * May, closes late October"), which stays true. A hard date only goes in
 * `deadline`, and only with the date we read it and the page we read it from,
 * so the UI can age it out gracefully instead of asserting it forever.
 *
 * ── 2. ELIGIBILITY IS MANDATORY ──────────────────────────────────────────
 *
 * Every entry declares delivery, eligible_regions, and a grade range. The
 * database enforces it with a CHECK constraint. This is the guard against the
 * two failures we watched live on a competitor: a German-language competition
 * run out of Berlin, and an Australia-and-New-Zealand-only stock game, both
 * ranked highly for a Jersey City sophomore. Neither was a distance problem —
 * both were virtual. Neither had an eligibility field.
 *
 * VIRTUAL DOES NOT MEAN OPEN TO EVERYONE. That assumption is exactly what put
 * Berlin at the top of a Hudson County teen's roadmap.
 *
 * ── 3. COST IS STATED OR MARKED UNCONFIRMED ──────────────────────────────
 *
 *   cost_cents: null       genuinely free, confirmed
 *   cost_cents: 25000      $250, confirmed on the organiser's own page
 *   cost_cents omitted     we could not confirm → card reads "Cost unconfirmed"
 *
 * Never a guess. A family working out whether their kid can afford something
 * needs that number to be true, and "unconfirmed" is a truthful answer where a
 * wrong number is not.
 *
 * ── 4. EVIDENCE HONESTY ──────────────────────────────────────────────────
 *
 * `evidence_kind: 'reference'` requires `supervised: true`, and a test enforces
 * it. The distinction is not the delivery format, it is whether a named human
 * would take the call. Crisis Text Line is virtual, rolling, and produces a
 * real reference — application, 30 hours of training, a supervisor. MIT
 * OpenCourseWare is virtual, rolling, and produces nothing of the kind, because
 * nobody there knows you exist. Calling a self-paced course a reference is what
 * makes a ladder decorative.
 *
 * ── 5. LINKS ARE VERIFIED, NOT REMEMBERED ────────────────────────────────
 *
 * The first pass wrote two URLs from memory (a deep faa.gov path and an
 * nyc.gov slug). Both 404'd on the first recheck. Read the URL off the page.
 */

export interface OpportunitySource {
  title: string
  /** Organisation running it. Becomes `company` on the row. */
  org: string
  slug: string
  apply_url: string
  description: string

  kind: 'competition' | 'program' | 'volunteer' | 'internship' | 'org_role'
  delivery: 'in_person' | 'virtual' | 'hybrid'
  /** 'US' national, 'GLOBAL' open worldwide, or specific like 'US-NJ'. */
  eligible_regions: string[]
  language: string
  min_grade: number
  max_grade: number

  /** Null = confirmed free. Omitted = unconfirmed, card says so. */
  cost_cents?: number | null
  recurrence: 'annual' | 'seasonal' | 'rolling' | 'one_time'
  /** Plain-English yearly cycle. Shown instead of a date. */
  windowNote: string
  /** A real date, only when read off the organiser's page, with proof. */
  deadline?: { date: string; verifiedOn: string; source: string }
  /** Months the entry is live. Empty means all year. */
  activeMonths?: number[]

  /** What finishing this actually produces. Drives evidence-strength sorting. */
  evidence_kind: 'hours' | 'title' | 'award' | 'reference' | 'income' | 'certificate'
  /** Is there a named human who would take a reference call? Required for 'reference'. */
  supervised?: boolean
  rung_from: number
  rung_to: number
  tags: string[]
}

/** Use for entries with no seasonal window. */
export const ALL_YEAR: number[] = []

/**
 * Awaiting the founder's curated list. Entries added here are picked up by
 * /api/ingest/opportunities on the next run.
 */
export const OPPORTUNITY_SOURCES: OpportunitySource[] = []

/** Entries whose season is open this month. Empty activeMonths means always. */
export function inSeasonOpportunities(month = new Date().getMonth() + 1): OpportunitySource[] {
  return OPPORTUNITY_SOURCES.filter(
    (o) => !o.activeMonths || o.activeMonths.length === 0 || o.activeMonths.includes(month),
  )
}

export function outOfSeasonOpportunities(month = new Date().getMonth() + 1): OpportunitySource[] {
  return OPPORTUNITY_SOURCES.filter(
    (o) => o.activeMonths && o.activeMonths.length > 0 && !o.activeMonths.includes(month),
  )
}
