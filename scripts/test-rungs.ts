/**
 * EMPLOYTEENS — ladder rung tests
 *
 *   npx tsx scripts/test-rungs.ts
 *
 * The rule under test throughout: rungs are detected from evidence, never
 * asserted. Anything self-reported comes back 'soft'.
 */

import { detectRung, nextActions, RUNG_LABELS, type LadderEvent } from '../lib/rungs'

const NOW = new Date('2026-08-10T12:00:00Z').getTime()
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`)
}

function ev(over: Partial<LadderEvent> = {}): LadderEvent {
  return {
    kind: 'job',
    status: 'applied',
    applied_at: daysAgo(5),
    outcome: null,
    first_response_at: null,
    evidence_kind: 'income',
    ...over,
  }
}
const rung = (i: Parameters<typeof detectRung>[0]) => detectRung({ ...i, now: NOW }).rung

console.log('— the bottom of the ladder —')
check('never asked about papers → 0, soft', detectRung({ age: 15, hasWorkingPapers: null, events: [], now: NOW }), { rung: 0, confidence: 'soft', reason: 'working papers status unknown' })
check('no papers → 0, confirmed', rung({ age: 15, hasWorkingPapers: false, events: [] }), 0)
check('papers in hand → 1', rung({ age: 15, hasWorkingPapers: true, events: [] }), 1)
check('18 needs no papers in NJ → 1', rung({ age: 18, hasWorkingPapers: false, events: [] }), 1)
check('17 without papers stays 0', rung({ age: 17, hasWorkingPapers: false, events: [] }), 0)

console.log('\n— activity rungs —')
check('started a program → 2', rung({ age: 14, hasWorkingPapers: false, events: [ev({ kind: 'program', evidence_kind: 'hours' })] }), 2)
check('started a volunteer role → 2', rung({ age: 14, hasWorkingPapers: null, events: [ev({ kind: 'volunteer' })] }), 2)
check('saved but never started → not 2', rung({ age: 14, hasWorkingPapers: true, events: [ev({ kind: 'program', applied_at: null, status: 'saved' })] }), 1)

console.log('\n— rung 3 is a named person, nothing to verify —')
check(
  'did a volunteer role but never named anyone → stays 2',
  rung({ age: 15, hasWorkingPapers: true, events: [ev({ kind: 'volunteer', evidence_kind: 'reference' })] }),
  2,
)
check(
  'named a reference → 3',
  rung({ age: 15, hasWorkingPapers: true, events: [ev({ kind: 'volunteer' })], reference: { name: 'Ms. Rivera', role: 'Librarian', org: 'JC Free Public Library' } }),
  3,
)
check(
  'rung 3 is soft, because we did not verify it',
  detectRung({ age: 15, hasWorkingPapers: true, events: [], reference: { name: 'Ms. Rivera', role: 'Librarian' }, now: NOW }).confidence,
  'soft',
)
check(
  'a job application still outranks a reference',
  rung({ age: 16, hasWorkingPapers: true, events: [ev()], reference: { name: 'Ms. Rivera', role: 'Librarian' } }),
  4,
)

console.log('\n— employment rungs —')
check('job application sent → 4', rung({ age: 16, hasWorkingPapers: true, events: [ev()] }), 4)
check('program signup alone is NOT 4', rung({ age: 16, hasWorkingPapers: true, events: [ev({ kind: 'program' })] }), 2)
check('employer replied → 5', rung({ age: 16, hasWorkingPapers: true, events: [ev({ first_response_at: daysAgo(2) })] }), 5)
check('interview outcome → 5', rung({ age: 16, hasWorkingPapers: true, events: [ev({ outcome: 'interview' })] }), 5)
check('hired → 6', rung({ age: 16, hasWorkingPapers: true, events: [ev({ outcome: 'hired' })] }), 6)
check('hired via status → 6', rung({ age: 17, hasWorkingPapers: true, events: [ev({ status: 'hired' })] }), 6)

console.log('\n— rung 7 —')
check('two hires → 7', rung({ age: 17, hasWorkingPapers: true, events: [ev({ outcome: 'hired' }), ev({ outcome: 'hired' })] }), 7)
check('one hire 90 days ago → 7', rung({ age: 17, hasWorkingPapers: true, events: [ev({ outcome: 'hired', applied_at: daysAgo(90) })] }), 7)
check('one hire 10 days ago → 6, not yet a reference', rung({ age: 17, hasWorkingPapers: true, events: [ev({ outcome: 'hired', applied_at: daysAgo(10) })] }), 6)

console.log('\n— high-water mark: a later rejection does not demote —')
check(
  'hired once, rejected elsewhere → still 6',
  rung({ age: 17, hasWorkingPapers: true, events: [ev({ outcome: 'hired' }), ev({ outcome: 'rejected', status: 'rejected' })] }),
  6,
)
check(
  'ghosted everywhere but did apply → still 4',
  rung({ age: 16, hasWorkingPapers: true, events: [ev({ outcome: 'no_response' }), ev({ outcome: 'no_response' })] }),
  4,
)

console.log('\n— next actions are age-aware —')
check('rung 0 realistic is always papers', nextActions(0, 14).realistic.target, 'papers')
check('rung 0 stretch avoids papers-gated work', nextActions(0, 14).stretch.feedFilter?.paid, false)
check('rung 1 under 16 leads with age-eligible jobs', nextActions(1, 15).realistic.label, 'Find something that hires at your age')
check('rung 1 at 16 leads with applying', nextActions(1, 16).realistic.label, 'Send your first application')
check('rung 2 stretch at 15 does not promise paid work', nextActions(2, 15).stretch.feedFilter?.paid, undefined)
check('rung 2 stretch at 17 does', nextActions(2, 17).stretch.feedFilter?.paid, true)
check('every rung has both actions', [0, 1, 2, 3, 4, 5, 6, 7].every((r) => {
  const a = nextActions(r as 0, 16)
  return !!a.realistic.label && !!a.stretch.label
}), true)
check('every rung has a label', Object.keys(RUNG_LABELS).length, 8)

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} FAILING`}`)
process.exit(failures === 0 ? 0 : 1)
