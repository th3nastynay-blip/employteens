/**
 * EMPLOYTEENS — the track-record ladder
 *
 * One progression, from "can't legally work yet" to "has a reference". Jobs and
 * extracurriculars sit on the same ladder because from a teen's point of view
 * they are the same thing: something you did that an adult will vouch for.
 *
 * Rungs 0–3 are activity-based and open at 14. Rungs 4–7 are employment-based.
 * A 14-year-old is never in a consolation mode, just earlier on the same climb.
 *
 * THE RULE THAT MAKES THIS REAL: rungs are DETECTED, never asserted.
 *
 * EC Database's onboarding asks "where are you starting from?", promises "one
 * realistic move and one stretch move", and then ignores the answer entirely —
 * verified 2026-08-10 by running identical inputs with grade 9 / "exploring"
 * and grade 12 / "experienced" and getting byte-identical results. The whole
 * value of a ladder is that the rung is true. So every rung here is derived
 * from evidence we hold (working papers, confirmed applications, reported
 * outcomes), and anything self-reported is returned with confidence 'soft' and
 * never used to make a claim to a third party.
 */

import type { Outcome } from './outcomes'

export type Rung = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export const RUNG_LABELS: Record<Rung, string> = {
  0: 'Not eligible yet',
  1: 'Ready to apply',
  2: 'Started something',
  3: 'Someone will vouch',
  4: 'Applied',
  5: 'Employer replied',
  6: 'Earning',
  7: 'Trusted',
}

/** Shown under the rung name. Second person, plain, no congratulation inflation. */
export const RUNG_BLURBS: Record<Rung, string> = {
  0: 'You need working papers before most places can hire you.',
  1: 'Papers are sorted. Now you need something on the list.',
  2: 'You have something going. Keep showing up.',
  3: 'An adult would vouch for you. That is the thing employers actually want.',
  4: 'Applications are out. Now it is a waiting game, and follow-ups help.',
  5: 'Someone got back to you. This is the part that turns into a job.',
  6: 'You are working. Nice.',
  7: 'You have a reference and a track record. That opens the next door.',
}

/** One application or activity, in the shape the detector needs. */
export interface LadderEvent {
  /** 'job' rows are employment; everything else is activity. */
  kind: string
  status: 'saved' | 'applied' | 'interviewing' | 'offered' | 'hired' | 'rejected'
  applied_at: string | null
  outcome: Outcome | null
  first_response_at: string | null
  /** What this produces if completed. Informational; does not gate any rung. */
  evidence_kind?: string | null
}

/**
 * A named adult who would vouch for the teen. Entered by the teen, not verified
 * by us — the value is in them having actually asked, not in our confirming it.
 * No employer account, no phone call, nothing for anyone else to do.
 */
export interface Reference {
  name: string
  /** "Librarian", "Camp director", "Manager". Free text. */
  role: string
  /** Where they know each other from. */
  org?: string
  /**
   * When the named adult themselves confirmed, via the vouch link. NULL means
   * the teen typed a name and nobody has agreed to anything yet.
   *
   * This is the ONLY field in the whole ladder that is not self-reported.
   */
  confirmedAt?: string | null
}

export interface RungInputs {
  age: number | null
  /** null means we have never asked. Distinct from false. */
  hasWorkingPapers: boolean | null
  events: LadderEvent[]
  /** Set once the teen names someone who agreed to be a reference. */
  reference?: Reference | null
  now?: number
}

export interface RungResult {
  rung: Rung
  /**
   * 'confirmed' — derived from evidence we hold.
   * 'soft'      — best guess from self-reported input. Never shown as a claim.
   */
  /**
   * 'verified'      — a third party confirmed it. Today that means exactly one
   *                   thing: a named adult clicked the vouch link.
   * 'self_reported' — the teen told us. True of EVERYTHING else on this
   *                   ladder: working papers, applications, replies, hires.
   *
   * This used to read 'confirmed' | 'soft', where 'confirmed' meant "the teen
   * did not contradict themselves". That wording let us describe a diary as a
   * credential. A tracker can run on self-report; a claim made to an employer
   * cannot.
   */
  confidence: 'verified' | 'self_reported'
  /** Why we landed here. Rendered in the admin view, not to the teen. */
  reason: string
}

function isJob(e: LadderEvent): boolean {
  return e.kind === 'job' || e.kind === 'internship' || e.kind === 'gig'
}

/**
 * Which rung is this teen actually on?
 *
 * Evaluated top-down, highest first. The first rung whose evidence exists wins,
 * because the ladder is a high-water mark: someone who got hired and then got
 * rejected somewhere else has still been hired.
 */
export function detectRung(input: RungInputs): RungResult {
  const events = input.events ?? []

  const hires = events.filter((e) => e.outcome === 'hired' || e.status === 'hired')
  const responses = events.filter(
    (e) => e.first_response_at !== null || e.outcome === 'interview' || e.status === 'interviewing' || e.status === 'offered',
  )
  const applied = events.filter((e) => e.applied_at !== null)

  // 7 — trusted. Someone other than the teen has vouched for them.
  //
  // The confirmed reference comes FIRST and is the only 'verified' rung on the
  // ladder. That is the whole point of the top rung: not "I did things" but
  // "an adult will say so".
  if (input.reference?.name && input.reference.confirmedAt) {
    return {
      rung: 7,
      confidence: 'verified',
      reason: `${input.reference.name} confirmed they would vouch`,
    }
  }

  if (hires.length >= 2) {
    return { rung: 7, confidence: 'self_reported', reason: `${hires.length} hires on record` }
  }

  // REMOVED: a rule promoting anyone whose APPLICATION was 60+ days old to
  // rung 7, on the reasoning that it "lasted long enough to be a reference".
  // It measured days since applying, not days worked. A teen who applied in
  // June, worked one shift in July and quit came out as "trusted". Tenure
  // needs a start and end date we do not collect, so rather than approximate
  // it with the wrong date we now require a real vouch or a second hire.

  if (hires.length === 1) {
    return { rung: 6, confidence: 'self_reported', reason: 'hired' }
  }

  if (responses.length > 0) {
    return { rung: 5, confidence: 'self_reported', reason: `${responses.length} employer response(s)` }
  }

  // 4 — applied. Only counts for employment. Signing up for a program is rung 2.
  if (applied.some(isJob)) {
    return { rung: 4, confidence: 'self_reported', reason: 'teen confirmed a job application' }
  }

  // 3 — someone will vouch. The teen named a specific adult who agreed.
  //
  // Deliberately self-reported. An earlier version required a program or
  // employer to confirm completion, which made the rung unreachable and implied
  // employers had to be on the platform. Neither is true. The value here is
  // that the teen actually asked someone, which is a thing they almost never
  // think to do while they are still there and which is much harder six months
  // later. We store the name so it can be pasted into an application.
  // 3 — asked someone. They named an adult; that adult has not replied yet.
  // Rung 7 is where the adult actually says yes.
  if (input.reference?.name) {
    return { rung: 3, confidence: 'self_reported', reason: `named a reference: ${input.reference.name}, not yet confirmed` }
  }

  // 2 — started something. Any non-job activity they actually began.
  if (applied.some((e) => !isJob(e))) {
    return { rung: 2, confidence: 'self_reported', reason: 'started a program, volunteer role, or competition' }
  }

  // 1 — eligible. Papers in hand, or old enough not to need them.
  if (input.hasWorkingPapers === true) {
    return { rung: 1, confidence: 'self_reported', reason: 'says they have working papers' }
  }
  if (input.age !== null && input.age >= 18) {
    return { rung: 1, confidence: 'self_reported', reason: '18 or older, no working papers required in NJ' }
  }

  // 0 — not eligible yet. If we have never asked about papers, this is a guess.
  return {
    rung: 0,
    confidence: 'self_reported',
    reason: input.hasWorkingPapers === null ? 'working papers status unknown' : 'no working papers yet',
  }
}

export interface NextAction {
  /** Short imperative, shown as the card title. */
  label: string
  /** One line of why. */
  detail: string
  /**
   * Where the card sends them. `feed` carries filter params so the action lands
   * on a filtered list rather than a generic browse.
   */
  target: 'papers' | 'feed' | 'tracker' | 'coach' | 'roadmap'
  feedFilter?: { kind?: string; maxRung?: Rung; paid?: boolean }
}

/**
 * One realistic move and one stretch move. This is the promise EC Database
 * makes on its experience question and does not keep, so ours is derived from
 * the detected rung and the teen's actual age rather than being decorative.
 */
export function nextActions(rung: Rung, age: number | null): { realistic: NextAction; stretch: NextAction } {
  const under16 = age !== null && age < 16

  switch (rung) {
    case 0:
      return {
        realistic: {
          label: 'Get your working papers',
          detail: 'Free, online, takes about 15 minutes plus a parent signature.',
          target: 'papers',
        },
        stretch: {
          label: 'Line up something you can start now',
          detail: 'Volunteer roles and programs do not need papers.',
          target: 'feed',
          feedFilter: { paid: false },
        },
      }

    case 1:
      return {
        realistic: under16
          ? {
              label: 'Find something that hires at your age',
              detail: 'These places are legally allowed to hire you right now.',
              target: 'feed',
              feedFilter: { kind: 'job' },
            }
          : {
              label: 'Send your first application',
              detail: 'One is enough to start. The tracker takes it from there.',
              target: 'feed',
              feedFilter: { kind: 'job' },
            },
        stretch: {
          label: 'Add one thing to your track record',
          detail: 'A program or volunteer role gives you someone who can vouch for you.',
          target: 'roadmap',
        },
      }

    case 2:
      return {
        realistic: {
          label: 'Keep showing up',
          detail: 'Turning up repeatedly is what turns an activity into a reference.',
          target: 'tracker',
        },
        stretch: under16
          ? {
              label: 'Apply to a place that hires at your age',
              detail: 'Legal for you now, even if the employer has not confirmed.',
              target: 'feed',
              feedFilter: { kind: 'job' },
            }
          : {
              label: 'Apply for a paid job',
              detail: 'You have something on your record now. Use it.',
              target: 'feed',
              feedFilter: { kind: 'job', paid: true },
            },
      }

    case 3:
      return {
        realistic: {
          label: 'Ask them to be a reference',
          detail: 'Do it while you are still there. It is much harder later.',
          target: 'coach',
        },
        stretch: {
          label: 'Apply somewhere that asks for one',
          detail: 'A named reference puts you ahead of most teen applicants.',
          target: 'feed',
          feedFilter: { kind: 'job', paid: true },
        },
      }

    case 4:
      return {
        realistic: {
          label: 'Follow up on what you sent',
          detail: 'A short polite check-in after a week measurably helps.',
          target: 'tracker',
        },
        stretch: {
          label: 'Get two more applications out',
          detail: 'Most teens hear back from roughly one in four.',
          target: 'feed',
          feedFilter: { kind: 'job' },
        },
      }

    case 5:
      return {
        realistic: {
          label: 'Prepare for the conversation',
          detail: 'Three things to say and two questions to ask.',
          target: 'coach',
        },
        stretch: {
          label: 'Keep the others warm',
          detail: 'Nothing is real until you are on a schedule.',
          target: 'tracker',
        },
      }

    case 6:
      return {
        realistic: {
          label: 'Log how it is going',
          detail: 'Hours and what you actually do become your resume later.',
          target: 'tracker',
        },
        stretch: {
          label: 'Ask your manager for a reference',
          detail: 'After a couple of months you have earned the ask.',
          target: 'coach',
        },
      }

    case 7:
      return {
        realistic: {
          label: 'Write down what you did',
          detail: 'Dates, hours, and one line on what you were responsible for.',
          target: 'coach',
        },
        stretch: {
          label: 'Go for something bigger',
          detail: 'A reference and a track record change what you can apply for.',
          target: 'feed',
          feedFilter: { kind: 'job', paid: true },
        },
      }
  }
}

/** Rungs 4 and up need employment, which is where age gating bites. */
export function isEmploymentRung(rung: Rung): boolean {
  return rung >= 4
}
