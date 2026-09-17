/**
 * EMPLOYTEENS — where an opportunity actually is
 *
 * ── THE BUG THIS EXISTS TO FIX ───────────────────────────────────────────
 *
 * lib/jobs/opportunity-ingest.ts used to stamp the location on every curated
 * opportunity like this:
 *
 *   location: isVirtual ? 'Virtual'
 *           : local === 'US-NY' ? 'New York, NY'
 *           : 'Jersey City, NJ'
 *
 * So EVERY in-person non-NY opportunity was written to the database as
 * "Jersey City, NJ" whether or not it was anywhere near Jersey City, and every
 * one of them got zip 07302. On the live feed that produced, among others:
 *
 *   University of Waterloo (Ontario, CANADA)      → "Jersey City, NJ"
 *   Rutgers School of Business, Camden (~90 mi)   → "Jersey City, NJ"
 *   Greater Newark Conservancy (Newark)           → "Jersey City, NJ"
 *   North Bergen Free Public Library              → "Jersey City, NJ"
 *   Meadowlands Research & Restoration (Lyndhurst)→ "Jersey City, NJ"
 *   Hackensack Riverkeeper (Hackensack)           → "Jersey City, NJ"
 *
 * Several of those cards contradicted themselves on screen — the Rutgers card
 * carried the tags "South Jersey" and "Long trip" directly above a location
 * line reading "Jersey City, NJ". This is the exact failure opportunity-
 * sources.ts spends its header warning about: a value we did not know, filled
 * in with a guess, and then presented to a teen as fact.
 *
 * ── WHY THE FIX IS A LOOKUP AND NOT JUST AN INGEST CHANGE ────────────────
 *
 * The ingest mapping is fixed too (toJobRow now reads `city`/`zip` off the
 * source entry and refuses to invent one). But the wrong strings are ALREADY
 * written into the jobs table, and correcting them means an UPDATE against
 * production data. Until that re-ingest runs, this module corrects the
 * display: given the row's apply_url — which is stable, unique, and already
 * stored — it returns the location the curated entry actually declares.
 *
 * Rows we have no curated entry for fall through to whatever the row says.
 * This never invents a location; it only replaces a known-fabricated one with
 * a known-true one, or leaves it alone.
 *
 * Sourcing for the addresses is in opportunity-sources.ts next to each entry.
 */

import { OPPORTUNITY_SOURCES } from './opportunity-sources'

/** apply_url → the true, curated location string. Built once at module load. */
const BY_APPLY_URL: Map<string, string> = (() => {
  const m = new Map<string, string>()
  for (const o of OPPORTUNITY_SOURCES) {
    if (o.delivery === 'virtual') {
      m.set(o.apply_url, 'Virtual')
    } else if (o.city) {
      m.set(o.apply_url, o.city)
    }
    // No city on an in-person entry → deliberately absent from the map, so
    // the caller keeps the stored value rather than us guessing a new one.
  }
  return m
})()

interface LocatableRow {
  location?: string | null
  apply_url?: string | null
  source?: string | null
}

/**
 * The location to PRINT on a card or sheet.
 *
 * Only ever overrides rows whose apply_url matches a curated opportunity.
 * Real employer jobs (Greenhouse, Lever, Adzuna, local SMB) are untouched —
 * their location comes from the employer's own posting and is not ours to
 * rewrite.
 */
export function displayLocation(row: LocatableRow): string {
  const url = row.apply_url ?? ''
  const curated = url ? BY_APPLY_URL.get(url) : undefined
  if (curated) return curated
  return String(row.location ?? '').trim() || 'Location not stated'
}

/** Exposed for tests and for the re-ingest script. */
export function curatedLocationCount(): number {
  return BY_APPLY_URL.size
}
