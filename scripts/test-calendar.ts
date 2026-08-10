/**
 * EMPLOYTEENS — opportunity calendar tests
 *
 *   npx tsx scripts/test-calendar.ts
 *
 * The hard part is seasons that wrap the year. A competition running September
 * through March has activeMonths [9,10,11,12,1,2,3], so "when does it open" is
 * not the smallest number in the array, and "how long is left" cannot be
 * computed by subtraction. Every off-by-one here shows a teen a wrong date.
 */

import {
  monthsForward,
  nextOpenIn,
  monthsRemaining,
  windowState,
  buildCalendar,
  calendarHighlights,
  groupByOpeningMonth,
  type CalendarEntry,
} from '../lib/opportunity-calendar'
import { OPPORTUNITY_SOURCES } from '../lib/jobs/opportunity-sources'

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`)
}

const AUTUMN_SPRING = [9, 10, 11, 12, 1, 2, 3]   // wraps the year
const SUMMER_COMP = [5, 6, 7, 8, 9, 10]          // does not wrap
const ALWAYS: number[] = []

console.log('— month arithmetic across the year boundary —')
check('August → February is 6 months', monthsForward(8, 2), 6)
check('February → August is 6 months', monthsForward(2, 8), 6)
check('December → January is 1 month', monthsForward(12, 1), 1)
check('January → December is 11 months', monthsForward(1, 12), 11)
check('same month is 0', monthsForward(7, 7), 0)

console.log('\n— when does it next open —')
check('wrapping season, asked in August, opens September', nextOpenIn(AUTUMN_SPRING, 8), 1)
check('wrapping season, asked in June, opens September', nextOpenIn(AUTUMN_SPRING, 6), 3)
check('wrapping season, asked in January, already open', nextOpenIn(AUTUMN_SPRING, 1), 0)
check('wrapping season, asked in April, opens September', nextOpenIn(AUTUMN_SPRING, 4), 5)
check('always-open has no wait', nextOpenIn(ALWAYS, 8), 0)

console.log('\n— how long is left —')
check('wrapping season in January has Feb+Mar left', monthsRemaining(AUTUMN_SPRING, 1), 2)
check('wrapping season in March is the last month', monthsRemaining(AUTUMN_SPRING, 3), 0)
check('wrapping season in December runs into March', monthsRemaining(AUTUMN_SPRING, 12), 3)
check('closed season returns null', monthsRemaining(AUTUMN_SPRING, 6), null)
check('always-open returns null (no end)', monthsRemaining(ALWAYS, 8), null)

console.log('\n— window state —')
check('always-open is open', windowState(ALWAYS, 8), 'open')
check('October in a summer comp is the last month', windowState(SUMMER_COMP, 10), 'closing_soon')
check('September in a summer comp closes next month', windowState(SUMMER_COMP, 9), 'closing_soon')
check('July in a summer comp is comfortably open', windowState(SUMMER_COMP, 7), 'open')
check('August, wrapping season opening September, is opening soon', windowState(AUTUMN_SPRING, 8), 'opening_soon')
check('June, wrapping season opening September, is later', windowState(AUTUMN_SPRING, 6), 'later')

console.log('\n— sorting puts urgency first, not chronology —')
const entries: CalendarEntry[] = [
  { slug: 'always', title: 'Always', org: 'A', activeMonths: ALWAYS, windowNote: '', kind: 'program', tags: [] },
  { slug: 'closing', title: 'Closing', org: 'B', activeMonths: [8], windowNote: '', kind: 'competition', tags: [] },
  { slug: 'soon', title: 'Soon', org: 'C', activeMonths: [9, 10], windowNote: '', kind: 'competition', tags: [] },
  { slug: 'later', title: 'Later', org: 'D', activeMonths: [2, 3], windowNote: '', kind: 'program', tags: [] },
]
const cal = buildCalendar(entries, 8)
check('order is closing, open, opening soon, later', cal.map((c) => c.slug), ['closing', 'always', 'soon', 'later'])
check('"always" reads as year-round, not "open now"', cal.find((c) => c.slug === 'always')?.timing, 'Open year-round')
check('the one-month window says it closes this month', cal.find((c) => c.slug === 'closing')?.timing, 'Closes this month')
check('the February one names the month', cal.find((c) => c.slug === 'later')?.timing, 'Opens in February')
check('highlights stay small', calendarHighlights(cal).length <= 4, true)

console.log('\n— against the real seed —')
for (const month of [1, 4, 8, 11]) {
  const real = buildCalendar(
    OPPORTUNITY_SOURCES.map((o) => ({
      slug: o.slug, title: o.title, org: o.org,
      activeMonths: o.activeMonths ?? [], windowNote: o.windowNote, kind: o.kind, tags: o.tags,
    })),
    month,
  )
  check(`month ${month}: every entry appears exactly once`, real.length, OPPORTUNITY_SOURCES.length)
  check(`month ${month}: nothing is left without a timing line`, real.every((r) => r.timing.length > 0), true)
  const groups = groupByOpeningMonth(real, month)
  check(`month ${month}: grouping keeps every item`, groups.reduce((n, g) => n + g.items.length, 0), OPPORTUNITY_SOURCES.length)
}

// The point of the whole feature: in August a teen sees only a slice as open,
// but the calendar still has plenty to show them.
const august = buildCalendar(
  OPPORTUNITY_SOURCES.map((o) => ({
    slug: o.slug, title: o.title, org: o.org,
    activeMonths: o.activeMonths ?? [], windowNote: o.windowNote, kind: o.kind, tags: o.tags,
  })),
  8,
)
const openInAugust = august.filter((a) => a.state === 'open' || a.state === 'closing_soon').length
console.log(`\n  August: ${openInAugust} open now, ${august.length - openInAugust} coming later`)
check('August has genuinely closed inventory to surface', august.length - openInAugust > 0, true)
check('August still has something open', openInAugust > 0, true)

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} FAILING`}`)
process.exit(failures === 0 ? 0 : 1)
