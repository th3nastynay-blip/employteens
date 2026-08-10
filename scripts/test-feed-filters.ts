/**
 * EMPLOYTEENS — unified feed filter tests
 *
 *   npx tsx scripts/test-feed-filters.ts
 */

import {
  applyChips, matchesChip, sortFeed, chipCounts, reasonLine,
  isVirtual, needsWorkingPapers, evidenceScore,
  FEED_CHIPS, type FeedItem,
} from '../lib/feed-filters'

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`)
}

function item(over: Partial<FeedItem> = {}): FeedItem {
  return {
    id: 'x', title: 'T', company: 'C', location: 'Jersey City, NJ',
    status: 'active', match_score: 80, match_explanation: '',
    kind: 'job', is_paid: true, delivery: 'in_person',
    evidence_kind: 'income', distance_miles: 2,
    ...over,
  } as unknown as FeedItem
}

console.log('— virtual detection —')
check('delivery virtual', isVirtual(item({ delivery: 'virtual' })), true)
check('location "Virtual" also counts', isVirtual(item({ delivery: null, location: 'Virtual' })), true)
check('a real town is not virtual', isVirtual(item()), false)

console.log('— working papers: the distinction that matters at 14 —')
check('a job needs papers', needsWorkingPapers(item({ kind: 'job' })), true)
check('an internship needs papers', needsWorkingPapers(item({ kind: 'internship' })), true)
check('volunteering does not', needsWorkingPapers(item({ kind: 'volunteer' })), false)
check('a competition does not', needsWorkingPapers(item({ kind: 'competition' })), false)
check('a course does not', needsWorkingPapers(item({ kind: 'program' })), false)

console.log('— chips —')
check('open_now only matches active', matchesChip(item({ status: 'inactive' }), 'open_now'), false)
check('starts_soon is the inverse', matchesChip(item({ status: 'inactive' }), 'starts_soon'), true)
check('paid matches is_paid', matchesChip(item({ is_paid: true }), 'paid'), true)
check('paid matches income evidence', matchesChip(item({ is_paid: null, evidence_kind: 'income' }), 'paid'), true)
check('near_me within 6 miles', matchesChip(item({ distance_miles: 3 }), 'near_me'), true)
check('near_me excludes 20 miles', matchesChip(item({ distance_miles: 20 }), 'near_me'), false)
check(
  'near_me EXCLUDES virtual — nowhere is not nearby',
  matchesChip(item({ delivery: 'virtual', distance_miles: 0 }), 'near_me'),
  false,
)
check('no_papers matches a volunteer role', matchesChip(item({ kind: 'volunteer' }), 'no_papers'), true)
check('no_papers rejects a job', matchesChip(item({ kind: 'job' }), 'no_papers'), false)

console.log('— chips AND together, they do not widen —')
const mixed = [
  item({ id: 'a', kind: 'job', is_paid: true, delivery: 'in_person', distance_miles: 2 }),
  item({ id: 'b', kind: 'volunteer', is_paid: false, delivery: 'virtual', evidence_kind: 'hours' }),
  item({ id: 'c', kind: 'competition', is_paid: false, delivery: 'virtual', evidence_kind: 'award' }),
]
check('paid alone', applyChips(mixed, ['paid']).map((i) => i.id), ['a'])
check('virtual alone', applyChips(mixed, ['virtual']).map((i) => i.id), ['b', 'c'])
check('paid + virtual narrows to nothing', applyChips(mixed, ['paid', 'virtual']).length, 0)
check('no chips returns everything', applyChips(mixed, []).length, 3)

console.log('— evidence strength breaks ties —')
check('income outranks certificate', evidenceScore(item({ evidence_kind: 'income' })) > evidenceScore(item({ evidence_kind: 'certificate' })), true)
check('reference outranks hours', evidenceScore(item({ evidence_kind: 'reference' })) > evidenceScore(item({ evidence_kind: 'hours' })), true)
const tied = sortFeed([
  item({ id: 'cert', match_score: 80, evidence_kind: 'certificate' }),
  item({ id: 'ref', match_score: 80, evidence_kind: 'reference' }),
])
check('equal match score → the one producing a reference wins', tied[0].id, 'ref')

console.log('— open always beats upcoming —')
const seasonal = sortFeed([
  item({ id: 'upcoming', status: 'inactive', match_score: 99, evidence_kind: 'income' }),
  item({ id: 'open', status: 'active', match_score: 40, evidence_kind: 'certificate' }),
])
check('a 40-match open listing beats a 99-match closed one', seasonal[0].id, 'open')

console.log('— counts and copy —')
const counts = chipCounts(mixed)
check('every chip reports a count', Object.keys(counts).length, FEED_CHIPS.length)
check('virtual count is 2', counts.virtual, 2)
check('every chip has an empty hint', FEED_CHIPS.every((c) => c.emptyHint.length > 10), true)

console.log('— reason lines lead with what is load-bearing —')
check('closed listing says so first', reasonLine(item({ status: 'inactive' })), 'Not open yet — worth knowing about now')
check('no-papers is the headline for a 14-year-old', reasonLine(item({ kind: 'volunteer' })), 'No working papers needed')
check(
  'without papers, "no papers needed" leads even over a reference',
  reasonLine(item({ kind: 'competition', evidence_kind: 'reference' })),
  'No working papers needed',
)
check(
  'with papers, the no-papers line is noise and the reference leads',
  reasonLine(item({ kind: 'competition', evidence_kind: 'reference' }), { hasPapers: true }),
  'Ends with someone who can be a reference',
)
check('paid and close says both', reasonLine(item({ is_paid: true, distance_miles: 1.5 })), 'Paid, 1.5 miles away')
check('every item gets a non-empty reason', [item(), item({ kind: 'volunteer' }), item({ status: 'inactive' })].every((i) => reasonLine(i).length > 0), true)

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} FAILING`}`)
process.exit(failures === 0 ? 0 : 1)
