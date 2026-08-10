/**
 * EMPLOYTEENS — Outcome cadence tests
 *
 * No test runner in this project, so this is a plain tsx script:
 *   npx tsx scripts/test-outcomes.ts
 *
 * Covers the rules that are expensive to get wrong: never nag, never ask
 * before day 5, never treat an early "still nothing" as a ghost.
 */

import {
  isCheckDue,
  selectApplicationToCheck,
  shouldRecordGhost,
  outcomeToStatus,
  FIRST_CHECK_DAYS,
  FINAL_CHECK_DAYS,
  type OutcomeCandidate,
} from '../lib/outcomes'

const NOW = new Date('2026-08-06T12:00:00Z').getTime()
const DAY = 86_400_000
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString()

function app(over: Partial<OutcomeCandidate> = {}): OutcomeCandidate {
  return {
    job_id: 'j1',
    status: 'applied',
    applied_at: daysAgo(7),
    outcome: null,
    outcome_checks: 0,
    last_outcome_check_at: null,
    ...over,
  }
}

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`)
}

console.log('— isCheckDue —')
check('day 7, never asked → due', isCheckDue(app(), NOW), true)
check(`day ${FIRST_CHECK_DAYS - 1} → too early`, isCheckDue(app({ applied_at: daysAgo(FIRST_CHECK_DAYS - 1) }), NOW), false)
check(`day ${FIRST_CHECK_DAYS} exactly → due`, isCheckDue(app({ applied_at: daysAgo(FIRST_CHECK_DAYS) }), NOW), true)
check('never applied (applied_at null) → not due', isCheckDue(app({ applied_at: null }), NOW), false)
check('outcome already recorded → not due', isCheckDue(app({ outcome: 'interview' }), NOW), false)
check('already asked twice → never again', isCheckDue(app({ outcome_checks: 2, applied_at: daysAgo(60) }), NOW), false)
check('teen moved it to interviewing → not due', isCheckDue(app({ status: 'interviewing' }), NOW), false)
check('saved but never applied → not due', isCheckDue(app({ status: 'saved' }), NOW), false)

console.log('\n— second ask window —')
check(
  'asked at day 5, now day 7 → do not re-ask',
  isCheckDue(app({ applied_at: daysAgo(7), outcome_checks: 1, last_outcome_check_at: daysAgo(2) }), NOW),
  false,
)
check(
  `asked at day 5, now day ${FINAL_CHECK_DAYS} → ask again`,
  isCheckDue(app({ applied_at: daysAgo(FINAL_CHECK_DAYS), outcome_checks: 1, last_outcome_check_at: daysAgo(FINAL_CHECK_DAYS - FIRST_CHECK_DAYS) }), NOW),
  true,
)
check(
  `day ${FINAL_CHECK_DAYS - 1} after one ask → still too early`,
  isCheckDue(app({ applied_at: daysAgo(FINAL_CHECK_DAYS - 1), outcome_checks: 1, last_outcome_check_at: daysAgo(9) }), NOW),
  false,
)

console.log('\n— selectApplicationToCheck —')
check(
  'picks the oldest due application',
  selectApplicationToCheck(
    [app({ job_id: 'new', applied_at: daysAgo(6) }), app({ job_id: 'old', applied_at: daysAgo(20) })],
    NOW,
  )?.job_id,
  'old',
)
check('nothing due → null', selectApplicationToCheck([app({ applied_at: daysAgo(1) })], NOW), null)
check('empty list → null', selectApplicationToCheck([], NOW), null)

console.log('\n— ghost recording —')
check('"still nothing" on 1st ask is NOT a ghost', shouldRecordGhost(app({ outcome_checks: 0 })), false)
check('"still nothing" on 2nd ask IS a ghost', shouldRecordGhost(app({ outcome_checks: 1 })), true)

console.log('\n— outcome → status —')
check('interview → interviewing', outcomeToStatus('interview'), 'interviewing')
check('hired → hired (not offered)', outcomeToStatus('hired'), 'hired')
check('rejected → rejected', outcomeToStatus('rejected'), 'rejected')
check('position_filled → rejected', outcomeToStatus('position_filled'), 'rejected')
check('no_response → no status change', outcomeToStatus('no_response'), null)

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} FAILING`}`)
process.exit(failures === 0 ? 0 : 1)
