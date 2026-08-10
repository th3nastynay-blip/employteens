/**
 * EMPLOYTEENS — Application outcome loop
 *
 * Records what the EMPLOYER did after a teen applied. This is the only source
 * of truth for the platform's actual KPI (interviews and hires); everything
 * else in the codebase measures inventory, not outcomes.
 *
 * DESIGN RULES, and why each one is here:
 *
 * 1. UNREPORTED IS NOT "NO RESPONSE". `outcome === null` means we never heard
 *    from the teen. `'no_response'` means the teen told us they were ghosted.
 *    Collapsing the two would let a low report rate masquerade as a high ghost
 *    rate, which would then defame employers in any future trust score.
 *
 * 2. ASK AT MOST TWICE. Day 5 and day 14, then never again for that
 *    application. A nag loop trains teens to dismiss the sheet, which
 *    destroys the data source you built it for.
 *
 * 3. DAY 5, NOT DAY 1. Fast-food and local retail typically respond inside a
 *    week; asking the day after applying produces "nothing yet" noise that
 *    tells you nothing about the employer.
 *
 * 4. ONE TAP. No follow-up questions, no date pickers. Each extra field
 *    measurably drops completion, and completion rate IS the data quality.
 */

export type Outcome =
  | 'no_response'
  | 'rejected'
  | 'interview'
  | 'hired'
  | 'position_filled'

export type ApplicationStatus =
  | 'saved' | 'applied' | 'interviewing' | 'offered' | 'hired' | 'rejected'

/** Days after applied_at before the first "did they get back to you?" ask. */
export const FIRST_CHECK_DAYS = 5
/** Days after applied_at for the second and final ask. */
export const FINAL_CHECK_DAYS = 14
/** Hard ceiling on prompts per application. */
export const MAX_OUTCOME_CHECKS = 2

/** An employer actually made contact (in either direction). */
const RESPONSE_OUTCOMES: Outcome[] = ['interview', 'hired', 'rejected', 'position_filled']

export function isEmployerResponse(o: Outcome | null | undefined): boolean {
  return !!o && RESPONSE_OUTCOMES.includes(o)
}

/**
 * Teen-facing copy. Deliberately plain — a 15-year-old reads this on a phone
 * five days after applying and needs to answer without thinking.
 */
export const OUTCOME_LABELS: Record<Outcome, string> = {
  interview:       'They set up an interview',
  hired:           'I got the job',
  rejected:        'They said no',
  position_filled: 'The job was already filled',
  no_response:     'Still nothing',
}

/**
 * Which outcomes advance the teen's own tracker status.
 * `no_response` deliberately maps to null: being ghosted does not move the
 * application anywhere, and auto-archiving it would hide jobs teens still
 * want to follow up on.
 */
export function outcomeToStatus(outcome: Outcome): ApplicationStatus | null {
  switch (outcome) {
    case 'interview':       return 'interviewing'
    case 'hired':           return 'hired'
    case 'rejected':        return 'rejected'
    case 'position_filled': return 'rejected'
    case 'no_response':     return null
  }
}

/** Minimum shape needed to decide whether an application is due for a check. */
export interface OutcomeCandidate {
  job_id: string
  status: ApplicationStatus
  applied_at: string | null
  outcome: Outcome | null
  outcome_checks: number
  last_outcome_check_at: string | null
}

const DAY_MS = 86_400_000

function daysSince(iso: string | null, now: number): number {
  if (!iso) return -1
  return (now - new Date(iso).getTime()) / DAY_MS
}

/**
 * Is this application due for an outcome prompt right now?
 *
 * Eligible only when all of these hold:
 *   - the teen confirmed they applied (applied_at stamped)
 *   - no terminal outcome recorded yet
 *   - the employer response is not already known from tracker status
 *   - we have asked fewer than MAX_OUTCOME_CHECKS times
 *   - enough calendar time has passed for the relevant ask
 */
export function isCheckDue(app: OutcomeCandidate, now: number = Date.now()): boolean {
  if (!app.applied_at) return false
  if (app.outcome) return false
  if (app.outcome_checks >= MAX_OUTCOME_CHECKS) return false

  // The teen already told us the answer by moving the card in the tracker.
  // Asking again would look broken.
  if (app.status !== 'applied') return false

  const age = daysSince(app.applied_at, now)
  const threshold = app.outcome_checks === 0 ? FIRST_CHECK_DAYS : FINAL_CHECK_DAYS
  if (age < threshold) return false

  // Never two prompts for the same application in the same window.
  const sinceLast = daysSince(app.last_outcome_check_at, now)
  if (app.last_outcome_check_at && sinceLast < FINAL_CHECK_DAYS - FIRST_CHECK_DAYS) return false

  return true
}

/**
 * Pick one application to ask about. One prompt per app open, never a queue —
 * a stack of sheets is how you teach someone to close sheets without reading.
 * Oldest first, because its answer is the most likely to be final.
 */
export function selectApplicationToCheck<T extends OutcomeCandidate>(
  apps: T[],
  now: number = Date.now(),
): T | null {
  const due = apps.filter((a) => isCheckDue(a, now))
  if (due.length === 0) return null
  return due.sort(
    (a, b) => new Date(a.applied_at!).getTime() - new Date(b.applied_at!).getTime(),
  )[0]
}

/**
 * "Still nothing" on the FINAL ask is a real signal (the employer ghosted).
 * On the first ask it is just early, so we record the check and come back.
 * This is the difference between measuring ghosting and measuring impatience.
 */
export function shouldRecordGhost(app: OutcomeCandidate): boolean {
  return app.outcome_checks + 1 >= MAX_OUTCOME_CHECKS
}
