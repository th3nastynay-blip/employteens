'use client'

/**
 * EMPLOYTEENS — the climb
 *
 * The profile page's spine, and the one thing on it a college-admissions
 * product cannot copy.
 *
 * WHAT THIS REPLACES. The page used to open with "What your AI knows about
 * you" — four generated sentences of the form "Public transit access increases
 * your eligible job radius by up to 10 miles". Every one of them was a
 * restatement of an input the teen had just typed, dressed up as an insight,
 * and two contained invented numbers ("up to 10 miles", "the widest job reach
 * of any profile type") that no code anywhere computes. Deleted rather than
 * softened: a fabricated statistic in a product aimed at 15-year-olds is worse
 * than an empty space, and the honest version of that block is this one.
 *
 * WHY A STAIRCASE AND NOT A PERCENTAGE. A percentage is a grade — it tells a
 * teen they are at 60% of being a person without saying what the missing 40%
 * is. Eight ascending bars say the thing a percentage cannot: you are HERE, the
 * climb is finite, and the next step is a named, specific action rather than a
 * number going up. Rungs 0-3 are open at 14, so a younger teen sees themselves
 * on the same ladder as everyone else, early, rather than in a consolation
 * mode.
 *
 * THE HONESTY RULE, AND IT IS LOAD-BEARING. Exactly one thing on this ladder is
 * confirmed by somebody other than the teen: a named adult clicking the vouch
 * link. Working papers, applications, replies and hires are all self-reported.
 * So the footer says which of the two this is, in plain words, every time. A
 * tracker can run on self-report. A claim made to an employer cannot, and the
 * moment we blur that we are teaching teens to inflate a resume.
 */

import { motion } from 'framer-motion'
import { RUNG_LABELS, RUNG_BLURBS, type Rung } from '@/lib/rungs'

interface Props {
  rung: Rung
  confidence: 'verified' | 'self_reported'
  /** Who vouched, when there is someone. Named because a name is the proof. */
  vouchedBy?: string | null
}

const ALL: Rung[] = [0, 1, 2, 3, 4, 5, 6, 7]

export function LadderStrip({ rung, confidence, vouchedBy }: Props) {
  return (
    <div
      style={{
        background: 'var(--et-surface)',
        border: '1px solid var(--et-border)',
        borderRadius: 22,
        padding: '18px 18px 16px',
      }}
    >
      <div className="flex items-baseline justify-between" style={{ marginBottom: 14 }}>
        <p className="numbered-eyebrow">WHERE YOU ARE</p>
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--et-placeholder)' }}>
          {rung} of 7
        </p>
      </div>

      {/* ── The staircase ──
          Height is the message, so it scales linearly with the rung index and
          nothing else. Bars past the current one keep their height and lose
          their colour: the climb ahead stays visible, which is the difference
          between "you are behind" and "here is what is left". */}
      <div
        className="flex items-end"
        style={{ gap: 5, height: 62 }}
        role="img"
        aria-label={`Rung ${rung} of 7: ${RUNG_LABELS[rung]}`}
      >
        {ALL.map((r) => {
          const reached = r <= rung
          const isNow = r === rung
          return (
            <div key={r} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.5, delay: 0.05 * r, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  transformOrigin: 'bottom',
                  height: `${28 + r * 10.2}%`,
                  borderRadius: 6,
                  background: isNow
                    ? 'linear-gradient(180deg, var(--et-match-from), var(--et-match-to))'
                    : reached
                      ? 'rgba(37,99,235,0.26)'
                      : 'var(--et-ground)',
                  boxShadow: isNow ? '0 4px 12px rgba(37,99,235,0.30)' : 'none',
                }}
              />
            </div>
          )
        })}
      </div>

      <h3 className="display display-md" style={{ marginTop: 15 }}>{RUNG_LABELS[rung]}</h3>
      <p style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--et-subtle)', marginTop: 5 }}>
        {RUNG_BLURBS[rung]}
      </p>

      {/* ── Provenance ──
          Not a badge that says "Verified" and leaves you guessing what was
          verified. It names the person, because the name is the entire value:
          "Trusted" means nothing to an employer, "John confirmed he was your
          supervisor" means something. */}
      <div style={{ marginTop: 13, paddingTop: 12, borderTop: '1px solid var(--et-border)' }}>
        {confidence === 'verified' ? (
          <p style={{ fontSize: '12px', color: 'var(--et-green)', fontWeight: 600, lineHeight: 1.5 }}>
            {vouchedBy ? `${vouchedBy} confirmed this. ` : 'An adult confirmed this. '}
            <span style={{ color: 'var(--et-muted)', fontWeight: 500 }}>
              It is the one thing here you did not have to be taken at your word for.
            </span>
          </p>
        ) : (
          <p style={{ fontSize: '12px', color: 'var(--et-muted)', lineHeight: 1.5 }}>
            Based on what you have told us. Get one adult to vouch for you and this
            becomes something an employer can check.
          </p>
        )}
      </div>
    </div>
  )
}
