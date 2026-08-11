'use client'

/**
 * EMPLOYTEENS — profile header
 *
 * Modelled on the Appybara profile Nayan sent, adapted for a 390px phone
 * rather than a 1440px desktop. What travels from that reference:
 *
 *   1. An ATTRIBUTE ROW above the name. On theirs it is nationality, ethnicity,
 *      test-optional. Ours is the stuff that actually decides what a teen can
 *      be shown: age, grade, state, papers, transport. Same idea — the facts
 *      that gate everything, stated once at the top instead of buried in
 *      sections further down.
 *
 *   2. A NUMBERED STEPPER. Theirs runs 1-7 across the top of "Complete
 *      profile", one circle per section, the current one ringed. It is the
 *      single best thing on that page: it turns "your profile is 60% done"
 *      into "you are on step 2 of 7 and step 3 is Academics". A percentage
 *      tells you that you failed at something; a stepper tells you what to do
 *      next. Ours scrolls horizontally because seven circles do not fit.
 *
 *   3. A STRENGTH CARD. Theirs is "How strong is your profile?" with a
 *      Chance Me CTA. Ours is the rung, because we can say something they
 *      cannot: not how you compare to other applicants, but what you have
 *      actually got on the record and what the next rung needs.
 *
 * What we do NOT take: the mascot, and any comparison-to-other-applicants
 * framing. Theirs sells admissions anxiety to sophomores optimising for
 * Princeton. Ours is a 15-year-old in Bayonne trying to get a first paycheck,
 * and ranking them against peers would be both useless and unkind.
 */

import { motion } from 'framer-motion'

export interface ProfileStep {
  id: string
  label: string
  done: boolean
  /** Where tapping the circle should take them. */
  href?: string
}

interface Props {
  name: string
  attributes: string[]
  steps: ProfileStep[]
  savedCount: number
  appliedCount: number
  onStep?: (step: ProfileStep) => void
}

export function ProfileHeader({ name, attributes, steps, savedCount, appliedCount, onStep }: Props) {
  const doneCount = steps.filter((s) => s.done).length
  // The first unfinished step. This is the whole point of a stepper: not a
  // score, a next action.
  const currentIdx = steps.findIndex((s) => !s.done)
  const current = currentIdx === -1 ? null : steps[currentIdx]
  const pct = steps.length === 0 ? 0 : Math.round((doneCount / steps.length) * 100)

  return (
    <div className="rise">
      {/* ── Attribute row ── */}
      {attributes.length > 0 && (
        <div
          className="flex gap-1.5 px-5 overflow-x-auto scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 10 } as React.CSSProperties}
        >
          {attributes.map((a) => (
            <span key={a} className="pill" style={{ flexShrink: 0 }}>{a}</span>
          ))}
        </div>
      )}

      {/* ── Identity ── */}
      <div className="px-5 flex items-center gap-3.5">
        <div
          style={{
            width: 62, height: 62, borderRadius: 18, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--et-match-from), var(--et-match-to))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(37,99,235,0.28)',
          }}
        >
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '25px', fontWeight: 800, color: '#fff' }}>
            {name?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="display display-lg" style={{ lineHeight: 1.1 }}>{name}</h1>
          <div className="flex gap-3" style={{ marginTop: 5 }}>
            <Stat n={appliedCount} label="applied" />
            <Stat n={savedCount} label="saved" />
          </div>
        </div>
      </div>

      {/* ── Stepper ── */}
      <div style={{ marginTop: 20 }}>
        <div className="flex items-baseline justify-between px-5" style={{ marginBottom: 12 }}>
          <p className="numbered-eyebrow">COMPLETE YOUR PROFILE</p>
          <p style={{ fontSize: '11px', color: 'var(--et-placeholder)', fontWeight: 700 }}>
            {doneCount} of {steps.length}
          </p>
        </div>

        <div
          className="flex px-5 overflow-x-auto scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 4 } as React.CSSProperties}
        >
          {steps.map((s, i) => {
            const isCurrent = i === currentIdx
            return (
              <button
                key={s.id}
                onClick={() => onStep?.(s)}
                className="press"
                style={{
                  flexShrink: 0, width: 78, background: 'none', border: 'none',
                  padding: 0, cursor: onStep ? 'pointer' : 'default',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}
              >
                {/* Circle + connector. The line is drawn behind so it joins
                    the circles rather than butting against them. */}
                <div style={{ position: 'relative', width: '100%', height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {i > 0 && (
                    <span style={{ position: 'absolute', left: 0, right: '50%', top: 17, height: 2, background: s.done || steps[i - 1].done ? 'var(--et-blue)' : 'var(--et-border-mid)' }} />
                  )}
                  {i < steps.length - 1 && (
                    <span style={{ position: 'absolute', left: '50%', right: 0, top: 17, height: 2, background: s.done ? 'var(--et-blue)' : 'var(--et-border-mid)' }} />
                  )}
                  <motion.span
                    initial={false}
                    animate={{ scale: isCurrent ? 1.06 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    style={{
                      position: 'relative', zIndex: 1,
                      width: 32, height: 32, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 800,
                      background: s.done
                        ? 'linear-gradient(135deg, var(--et-match-from), var(--et-match-to))'
                        : 'var(--et-surface)',
                      color: s.done ? '#fff' : isCurrent ? 'var(--et-blue)' : 'var(--et-placeholder)',
                      border: s.done
                        ? 'none'
                        : `2px solid ${isCurrent ? 'var(--et-blue)' : 'var(--et-border-mid)'}`,
                    }}
                  >
                    {s.done ? (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : i + 1}
                  </motion.span>
                </div>

                <span
                  style={{
                    fontSize: '10.5px', lineHeight: 1.25, marginTop: 5, textAlign: 'center',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? 'var(--et-blue)' : s.done ? 'var(--et-subtle)' : 'var(--et-placeholder)',
                  }}
                >
                  {s.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Next action ──
          A percentage tells a teen they failed at something. A named next step
          tells them what to do. So this says the step, not the number. */}
      {current && (
        <div className="px-4" style={{ marginTop: 16 }}>
          <button
            onClick={() => onStep?.(current)}
            className="grad-border press"
            style={{
              width: '100%', textAlign: 'left', padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              background: 'var(--et-surface)',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="numbered-eyebrow" style={{ marginBottom: 3 }}>NEXT</p>
              <p className="display" style={{ fontSize: '15px' }}>Add your {current.label.toLowerCase()}</p>
              <div style={{ marginTop: 9, height: 5, borderRadius: 99, background: 'var(--et-surface-2)', overflow: 'hidden' }}>
                <div
                  className="fill-track"
                  style={{
                    width: `${pct}%`, height: '100%', borderRadius: 99,
                    background: 'linear-gradient(90deg, var(--et-match-from), var(--et-match-to))',
                  }}
                />
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
              <path d="M6 3.5L10.5 8L6 12.5" stroke="var(--et-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span style={{ fontSize: '12.5px', color: 'var(--et-muted)' }}>
      <strong style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--et-ink)', fontWeight: 800 }}>{n}</strong>
      {' '}{label}
    </span>
  )
}
