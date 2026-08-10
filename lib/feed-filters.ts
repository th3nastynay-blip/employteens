/**
 * EMPLOYTEENS — unified feed filtering
 *
 * ONE FEED, NOT TWO TABS.
 *
 * Jobs and opportunities live in the same table and render in the same list.
 * A teen should never have to decide whether they are a "jobs person" or an
 * "extracurriculars person" before they can look at anything — that decision is
 * the two-databases problem showing up in the navigation. EC Database splits
 * Profiles / Internships / Opportunities / Passion Project into four tabs, and
 * it is why their onboarding hands you three disconnected results and calls it
 * a roadmap.
 *
 * So: kind is a filter chip, never a destination.
 *
 * NO NEW ONBOARDING QUESTIONS FOR THIS.
 *
 * Everything here runs off profile data we already collect: age, school_grade,
 * zip, transportation, interests. The one input we do not have is sort mode
 * (money vs experience vs college), and by our own rule — every question needs
 * a named consumer in ranking code — it does not ship until the chip data shows
 * teens actually want it. Watch what they tap first.
 */

import type { JobMatch } from './types/database'

export type FeedChip = 'open_now' | 'paid' | 'near_me' | 'virtual' | 'starts_soon' | 'no_papers'

export interface ChipDef {
  id: FeedChip
  label: string
  /** Shown when the chip is active and matches nothing. */
  emptyHint: string
}

export const FEED_CHIPS: ChipDef[] = [
  { id: 'open_now', label: 'Open now', emptyHint: 'Nothing is open right now. Try Starts soon.' },
  { id: 'paid', label: 'Paid', emptyHint: 'No paid listings match. Unpaid roles still build your record.' },
  { id: 'near_me', label: 'Near me', emptyHint: 'Nothing nearby right now. Virtual has no commute.' },
  { id: 'virtual', label: 'Virtual', emptyHint: 'No virtual options match right now.' },
  { id: 'starts_soon', label: 'Starts soon', emptyHint: 'Nothing opening in the next couple of months.' },
  { id: 'no_papers', label: 'No papers needed', emptyHint: 'Everything here needs working papers.' },
]

/** How far counts as "near me". Generous, because a teen will travel for money. */
const NEAR_ME_MILES = 6

export interface FeedItem extends JobMatch {
  kind?: string
  delivery?: string | null
  is_paid?: boolean | null
  evidence_kind?: string | null
  window_opens?: string | null
  deadline?: string | null
  rung_from?: number | null
  logo_url?: string | null
}

export function isVirtual(item: FeedItem): boolean {
  return item.delivery === 'virtual' || String(item.location ?? '').toLowerCase() === 'virtual'
}

/**
 * Does this need NJ working papers?
 *
 * Employment does. Volunteering, competitions and courses do not, and that
 * distinction is the single most useful thing we can tell a 14-year-old,
 * because "I can't work yet" is the reason most of them stop looking.
 */
export function needsWorkingPapers(item: FeedItem): boolean {
  return item.kind === 'job' || item.kind === 'internship' || item.kind === undefined
}

export function matchesChip(item: FeedItem, chip: FeedChip): boolean {
  switch (chip) {
    case 'open_now':
      return item.status === 'active'
    case 'paid':
      return item.is_paid === true || item.evidence_kind === 'income'
    case 'near_me':
      // Virtual is deliberately excluded. It is not "near" — it is nowhere,
      // and lumping it in would make the chip meaningless for a teen who
      // specifically wants to leave the house.
      return !isVirtual(item) && typeof item.distance_miles === 'number' && item.distance_miles <= NEAR_ME_MILES
    case 'virtual':
      return isVirtual(item)
    case 'starts_soon':
      return item.status !== 'active'
    case 'no_papers':
      return !needsWorkingPapers(item)
  }
}

/** Chips are AND-ed. Two chips narrow, they do not widen. */
export function applyChips(items: FeedItem[], active: FeedChip[]): FeedItem[] {
  if (active.length === 0) return items
  return items.filter((i) => active.every((c) => matchesChip(i, c)))
}

/**
 * Evidence strength, used to break ties.
 *
 * The honest ranking nobody else does: an open self-paced course produces a
 * PDF, a supervised local role produces a human who will pick up the phone.
 * Both belong in the feed; they should not be adjacent in it.
 */
const EVIDENCE_WEIGHT: Record<string, number> = {
  income: 6, reference: 5, title: 4, award: 3, hours: 2, certificate: 1,
}

export function evidenceScore(item: FeedItem): number {
  return EVIDENCE_WEIGHT[item.evidence_kind ?? ''] ?? 0
}

/**
 * Feed order.
 *
 * Match score leads, because the whole point is personalisation. Evidence
 * strength breaks ties, so of two equally-matched listings the one that leaves
 * you with a reference wins. Open beats upcoming, always.
 */
export function sortFeed(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => {
    const aOpen = a.status === 'active' ? 1 : 0
    const bOpen = b.status === 'active' ? 1 : 0
    if (aOpen !== bOpen) return bOpen - aOpen

    const byMatch = (b.match_score ?? 0) - (a.match_score ?? 0)
    if (Math.abs(byMatch) > 4) return byMatch

    const byEvidence = evidenceScore(b) - evidenceScore(a)
    if (byEvidence !== 0) return byEvidence

    return byMatch
  })
}

/** Counts for the chip row, so a chip that would empty the list reads as 0. */
export function chipCounts(items: FeedItem[]): Record<FeedChip, number> {
  const out = {} as Record<FeedChip, number>
  for (const c of FEED_CHIPS) out[c.id] = items.filter((i) => matchesChip(i, c.id)).length
  return out
}

/**
 * One line explaining why this is in the feed.
 *
 * EC Database's version says "It is virtual, so you can participate from Jersey
 * City", which is true of everything virtual and therefore says nothing. Ours
 * leads with whatever is actually load-bearing for this listing.
 */
export function reasonLine(item: FeedItem, opts: { hasPapers?: boolean } = {}): string {
  if (item.status !== 'active') return 'Not open yet — worth knowing about now'
  // "No working papers needed" is the single most load-bearing fact for a
  // 14-year-old, because not having them is why most of them stop looking. It
  // is noise for someone who already has them, so it only leads when we know
  // they do not.
  if (!needsWorkingPapers(item) && opts.hasPapers !== true) return 'No working papers needed'
  if (item.evidence_kind === 'reference') return 'Ends with someone who can be a reference'
  if (item.is_paid && typeof item.distance_miles === 'number' && item.distance_miles <= NEAR_ME_MILES) {
    return `Paid, ${item.distance_miles.toFixed(1)} miles away`
  }
  if (isVirtual(item)) return 'Do it from home, no commute'
  if (typeof item.distance_miles === 'number') return `${item.distance_miles.toFixed(1)} miles away`
  return item.match_explanation || 'Matches your interests'
}
