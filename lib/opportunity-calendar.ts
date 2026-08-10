/**
 * EMPLOYTEENS — the opportunity calendar
 *
 * THE PROBLEM THIS SOLVES
 *
 * Most of what a teen can actually do is seasonal, and the seasons are offset
 * from each other. Teen hiring peaks in May and June. Municipal program
 * applications open January through April. Competitions run in autumn. Hospital
 * volunteer intake recruits in late winter for summer.
 *
 * Which means that on any given day, a large share of real opportunities are
 * closed, and an app that only shows what is open right now tells a
 * 14-year-old in August that there is nothing for them. That is false. There is
 * plenty for them; it opens in eleven weeks and they need to know now, because
 * the Congressional App Challenge closes in late October and hospital intake
 * opens in February and both are gone by the time you notice.
 *
 * Nine of the fourteen seeded opportunities are seasonal. Without this, most of
 * the inventory is invisible most of the year.
 *
 * WHY THIS MATTERS MORE FOR US THAN FOR A JOB BOARD
 *
 * A job board can afford to only show what is live, because job reqs are
 * continuously replenished. Our inventory is thin and lumpy. Turning "nothing
 * right now" into "here is what is coming and when to act" is the difference
 * between a teen closing the app in September and opening it again in January.
 */

/** Months an opportunity's application window is open. Empty means always. */
export type ActiveMonths = number[]

export type WindowState =
  /** Open right now. Act. */
  | 'open'
  /** Opens soon enough to prepare for. */
  | 'opening_soon'
  /** Closes soon enough that waiting is a mistake. */
  | 'closing_soon'
  /** Real, but months away. Worth knowing, not worth acting on today. */
  | 'later'

export interface CalendarEntry {
  slug: string
  title: string
  org: string
  activeMonths: ActiveMonths
  windowNote: string
  kind: string
  tags: string[]
}

export interface CalendarItem extends CalendarEntry {
  state: WindowState
  /** Months until the window opens. 0 when already open. */
  monthsUntilOpen: number
  /** Months until it closes, when open. Null when closed. */
  monthsUntilClose: number | null
  /** Short human line: "Opens in February", "Closes next month". */
  timing: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Wrap a month number into 1–12. Handles December → January rollover. */
function wrap(m: number): number {
  return ((m - 1) % 12 + 12) % 12 + 1
}

/**
 * Months from `from` until `target`, going forward only. Same month is 0.
 * This is the whole reason the calendar works across a year boundary: an
 * opportunity opening in February is 6 months away in August, not -6.
 */
export function monthsForward(from: number, target: number): number {
  return wrap(target - from + 1) - 1
}

/**
 * When does this window next open, relative to `now`?
 *
 * Seasons can wrap the year (a competition running September through March has
 * activeMonths [9,10,11,12,1,2,3]), so "the first active month" is not simply
 * the smallest number. We find the nearest one going forward.
 */
export function nextOpenIn(activeMonths: ActiveMonths, now: number): number {
  if (!activeMonths || activeMonths.length === 0) return 0
  if (activeMonths.includes(now)) return 0
  return Math.min(...activeMonths.map((m) => monthsForward(now, m)))
}

/**
 * How many more months does an open window last?
 *
 * Walks forward from `now` while months stay active, so a wrapping season is
 * measured correctly. Returns null when the window is not currently open.
 */
export function monthsRemaining(activeMonths: ActiveMonths, now: number): number | null {
  if (!activeMonths || activeMonths.length === 0) return null // always open
  if (!activeMonths.includes(now)) return null
  let n = 0
  while (n < 12 && activeMonths.includes(wrap(now + n + 1))) n++
  return n
}

export function windowState(activeMonths: ActiveMonths, now: number): WindowState {
  if (!activeMonths || activeMonths.length === 0) return 'open'

  if (activeMonths.includes(now)) {
    const left = monthsRemaining(activeMonths, now)
    // One month left means "this is your last chance", which is a different
    // message from "it is open". Teens do not act on ambient availability.
    return left !== null && left <= 1 ? 'closing_soon' : 'open'
  }

  const until = nextOpenIn(activeMonths, now)
  // Two months is roughly the horizon where preparing is useful: long enough
  // to gather a portfolio or ask a teacher, short enough to feel real.
  return until <= 2 ? 'opening_soon' : 'later'
}

function timingLabel(state: WindowState, untilOpen: number, untilClose: number | null, now: number, activeMonths: ActiveMonths): string {
  switch (state) {
    case 'open':
      return untilClose === null ? 'Open year-round' : 'Open now'
    case 'closing_soon':
      return untilClose === 0 ? 'Closes this month' : 'Closes next month'
    case 'opening_soon':
    case 'later': {
      const openMonth = activeMonths.reduce((best, m) => {
        const d = monthsForward(now, m)
        return d < monthsForward(now, best) ? m : best
      }, activeMonths[0])
      if (untilOpen === 1) return 'Opens next month'
      return `Opens in ${MONTH_NAMES[openMonth - 1]}`
    }
  }
}

/**
 * Build the calendar. Sorted so the things a teen should act on sit at the top
 * and the far-future ones sit at the bottom, rather than sorting by date, which
 * would bury "closes this month" under "open year-round".
 */
export function buildCalendar(entries: CalendarEntry[], now = new Date().getMonth() + 1): CalendarItem[] {
  const ORDER: Record<WindowState, number> = {
    closing_soon: 0,
    open: 1,
    opening_soon: 2,
    later: 3,
  }

  return entries
    .map((e) => {
      const state = windowState(e.activeMonths, now)
      const monthsUntilOpen = nextOpenIn(e.activeMonths, now)
      const monthsUntilClose = monthsRemaining(e.activeMonths, now)
      return {
        ...e,
        state,
        monthsUntilOpen,
        monthsUntilClose,
        timing: timingLabel(state, monthsUntilOpen, monthsUntilClose, now, e.activeMonths),
      }
    })
    .sort((a, b) => {
      const byState = ORDER[a.state] - ORDER[b.state]
      if (byState !== 0) return byState
      // Within a state, soonest first.
      return a.monthsUntilOpen - b.monthsUntilOpen
    })
}

/**
 * What a teen should be told about right now, given they cannot act on most of
 * it yet. Deliberately small: the two things closing and the two opening.
 * A twelve-month wall of chips is a calendar, not a prompt.
 */
export function calendarHighlights(items: CalendarItem[]): CalendarItem[] {
  const closing = items.filter((i) => i.state === 'closing_soon').slice(0, 2)
  const soon = items.filter((i) => i.state === 'opening_soon').slice(0, 2)
  return [...closing, ...soon]
}

/** Group by the month they next open, for a twelve-month view. */
export function groupByOpeningMonth(items: CalendarItem[], now = new Date().getMonth() + 1): Array<{ month: number; label: string; items: CalendarItem[] }> {
  const buckets = new Map<number, CalendarItem[]>()
  for (const item of items) {
    const m = item.state === 'open' || item.state === 'closing_soon' ? now : wrap(now + item.monthsUntilOpen)
    if (!buckets.has(m)) buckets.set(m, [])
    buckets.get(m)!.push(item)
  }
  return [...buckets.entries()]
    .sort((a, b) => monthsForward(now, a[0]) - monthsForward(now, b[0]))
    .map(([month, items]) => ({
      month,
      label: month === now ? 'This month' : MONTH_NAMES[month - 1],
      items,
    }))
}
