'use client'

/**
 * EMPLOYTEENS — "Did they get back to you?" bottom sheet
 *
 * Mounted once in the (app) layout, alongside ApplyConfirmSheet. Where that
 * sheet asks whether the teen applied, this one asks what the EMPLOYER did,
 * which is the only way the platform can measure interviews and hires.
 *
 * Behaviour:
 *   - fires at most once per app session, and only if no apply-confirm is
 *     pending (two stacked sheets is how you train someone to dismiss both)
 *   - asks about a single application, oldest-first, day 5 then day 14
 *   - one tap, five options, no follow-up questions
 *   - "Still nothing" on the first ask records a check and comes back later;
 *     on the second ask it records a real ghost. See lib/outcomes.ts.
 *
 * Skipping (backdrop tap / "Ask me later") records NOTHING. An unanswered
 * prompt must stay NULL in the database, not become 'no_response'.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { getPendingApply } from '@/lib/apply-tracking'
import {
  selectApplicationToCheck,
  shouldRecordGhost,
  outcomeToStatus,
  OUTCOME_LABELS,
  type Outcome,
  type OutcomeCandidate,
} from '@/lib/outcomes'

const SESSION_KEY = 'et-outcome-asked'

interface DueApplication extends OutcomeCandidate {
  title: string
  company: string
}

/** Order matters: the good news sits at the top where a thumb lands first. */
const OPTIONS: Outcome[] = ['interview', 'hired', 'rejected', 'position_filled', 'no_response']

const OPTION_TONE: Record<Outcome, { bg: string; fg: string; border: string }> = {
  interview:       { bg: 'var(--et-green-light)', fg: 'var(--et-green)', border: 'transparent' },
  hired:           { bg: 'var(--et-green-light)', fg: 'var(--et-green)', border: 'transparent' },
  rejected:        { bg: 'var(--et-surface-2)', fg: 'var(--et-subtle)', border: 'var(--et-border-mid)' },
  position_filled: { bg: 'var(--et-surface-2)', fg: 'var(--et-subtle)', border: 'var(--et-border-mid)' },
  no_response:     { bg: 'var(--et-surface-2)', fg: 'var(--et-subtle)', border: 'var(--et-border-mid)' },
}

export function OutcomeCheckSheet() {
  const [due, setDue] = useState<DueApplication | null>(null)
  const [saving, setSaving] = useState<Outcome | null>(null)
  const [done, setDone] = useState<Outcome | null>(null)
  const checked = useRef(false)

  const load = useCallback(async () => {
    if (checked.current) return
    checked.current = true

    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return
      // An unanswered "did you apply?" takes priority — that sheet's answer is
      // what creates the applied_at this one depends on.
      if (getPendingApply()) return
    } catch { /* storage unavailable — continue, worst case we ask again */ }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('applications')
      .select('job_id, status, applied_at, outcome, outcome_checks, last_outcome_check_at, jobs (title, company)')
      .eq('user_id', user.id)
      .eq('status', 'applied')
      .is('outcome', null)
      .not('applied_at', 'is', null)
    if (error || !data) return

    type Raw = OutcomeCandidate & { jobs: { title: string; company: string } | null }
    const rows = (data as unknown as Raw[]).filter((r) => r.jobs)

    const pick = selectApplicationToCheck(rows)
    if (!pick) return

    setDue({ ...pick, title: pick.jobs!.title, company: pick.jobs!.company })
  }, [])

  useEffect(() => {
    // Delay past first paint — the dashboard should render before anything
    // slides over it.
    const t = setTimeout(load, 1_200)
    return () => clearTimeout(t)
  }, [load])

  async function record(outcome: Outcome) {
    if (!due || saving) return
    setSaving(outcome)

    const now = new Date().toISOString()
    const ghosted = outcome === 'no_response'
    // "Still nothing" on the first ask is not an answer yet — bump the counter
    // and let the day-14 prompt decide.
    const terminal = !ghosted || shouldRecordGhost(due)

    const patch: Record<string, unknown> = {
      outcome_checks: due.outcome_checks + 1,
      last_outcome_check_at: now,
      updated_at: now,
    }
    if (terminal) {
      patch.outcome = outcome
      patch.outcome_reported_at = now
      // Only a real employer response gets a response timestamp. Approximate
      // (the teen is reporting after the fact) so it reads as an upper bound.
      if (!ghosted) patch.first_response_at = now
      const status = outcomeToStatus(outcome)
      if (status) patch.status = status
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('applications')
          .update(patch)
          .eq('user_id', user.id)
          .eq('job_id', due.job_id)
      }
    } catch { /* non-critical: the prompt returns next session */ }

    try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* noop */ }
    setSaving(null)
    setDone(outcome)
    // Brief acknowledgement, then dismiss. Teens who tell you good news should
    // see the app react to it.
    setTimeout(() => { setDone(null); setDue(null) }, 1_600)
  }

  /** Explicit skip. Records nothing — silence must stay silence in the data. */
  function askLater() {
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* noop */ }
    setDue(null)
  }

  return (
    <AnimatePresence>
      {due && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={askLater}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,15,20,0.45)',
              zIndex: 60, backdropFilter: 'blur(2px)',
            }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 61,
              maxWidth: 384, margin: '0 auto',
              background: 'var(--et-surface)',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
              boxShadow: '0 -8px 40px rgba(15,15,20,0.18)',
            }}
          >
            <div style={{
              width: 36, height: 4, borderRadius: 2, background: 'var(--et-border-mid)',
              margin: '0 auto 16px',
            }} />

            {done ? (
              <div style={{ padding: '18px 0 26px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--et-ink)', letterSpacing: '-0.02em' }}>
                  {done === 'hired' ? 'Congrats. That’s the whole point. \u{1F389}'
                    : done === 'interview' ? 'Nice — go get it.'
                    : 'Got it, thanks.'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: 6 }}>
                  {done === 'no_response'
                    ? 'This helps us figure out which employers actually reply.'
                    : 'Logged to your tracker.'}
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--et-placeholder)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Following up
                </p>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--et-ink)', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                  Did {due.company} get back to you?
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: 4, marginBottom: 18 }}>
                  {due.title} · applied {daysAgoLabel(due.applied_at)}
                </p>

                <div className="flex flex-col gap-2">
                  {OPTIONS.map((o) => {
                    const tone = OPTION_TONE[o]
                    return (
                      <motion.button
                        key={o}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => record(o)}
                        disabled={!!saving}
                        style={{
                          height: 46, borderRadius: 'var(--radius-md)',
                          fontSize: '15px', fontWeight: 700,
                          background: tone.bg, color: tone.fg,
                          border: `1.5px solid ${tone.border}`,
                          cursor: 'pointer', opacity: saving && saving !== o ? 0.5 : 1,
                        }}
                      >
                        {saving === o ? 'Saving…' : OUTCOME_LABELS[o]}
                      </motion.button>
                    )
                  })}
                  <button
                    onClick={askLater}
                    style={{
                      background: 'none', border: 'none', padding: '8px 0 0',
                      fontSize: '12px', color: 'var(--et-placeholder)', fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    Ask me later
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function daysAgoLabel(iso: string | null): string {
  if (!iso) return 'recently'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  return `${Math.floor(days / 7)} weeks ago`
}
