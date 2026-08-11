'use client'

/**
 * EMPLOYTEENS — the rung card
 *
 * Sits at the top of the dashboard and answers the only question a teen opens
 * this app with: what do I do next.
 *
 * Replaces the "you have N matches" header, which told them about our inventory
 * rather than about them. The rung is derived from evidence we hold (working
 * papers, confirmed applications, reported outcomes) via lib/rungs.ts, and the
 * two actions come from the same place — so unlike EC Database, which promises
 * "one realistic move and one stretch move" and then ignores your answers, both
 * of ours change when your situation does.
 *
 * Self-fetching, same pattern as OutcomeCheckSheet, so wiring it in is one line.
 */

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  detectRung,
  nextActions,
  RUNG_LABELS,
  RUNG_BLURBS,
  type Rung,
  type LadderEvent,
  type NextAction,
} from '@/lib/rungs'

interface Props {
  /** Router push, injected so this component stays free of routing concerns. */
  onNavigate?: (action: NextAction) => void
  /**
   * Reports the detected rung upward. The dashboard uses it to decide whether
   * to show the supporting "things you can do now" section, which is keyed on
   * rung rather than age — a 16-year-old with no working papers needs the same
   * help as a 14-year-old, and the ladder is one climb.
   */
  onRung?: (rung: Rung) => void
}

export function RungCard({ onNavigate, onRung }: Props) {
  const [rung, setRung] = useState<Rung | null>(null)
  const [age, setAge] = useState<number | null>(null)
  const [stats, setStats] = useState({ applied: 0, replied: 0, hired: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: profile }, { data: apps }] = await Promise.all([
        supabase
          .from('users')
          .select('age, has_working_papers, reference_name, reference_role, reference_org, reference_confirmed_at')
          .eq('id', user.id)
          .single(),
        supabase
          .from('applications')
          .select('status, applied_at, outcome, first_response_at, jobs (kind, evidence_kind)')
          .eq('user_id', user.id),
      ])

      type Raw = {
        status: LadderEvent['status']
        applied_at: string | null
        outcome: LadderEvent['outcome']
        first_response_at: string | null
        jobs: { kind: string | null; evidence_kind: string | null } | null
      }

      const events: LadderEvent[] = ((apps ?? []) as unknown as Raw[]).map((a) => ({
        kind: a.jobs?.kind ?? 'job',
        status: a.status,
        applied_at: a.applied_at,
        outcome: a.outcome,
        first_response_at: a.first_response_at,
        evidence_kind: a.jobs?.evidence_kind ?? null,
      }))

      const result = detectRung({
        age: (profile?.age as number) ?? null,
        hasWorkingPapers: (profile?.has_working_papers as boolean | null) ?? null,
        events,
        reference: profile?.reference_name
          ? {
              name: profile.reference_name as string,
              role: (profile.reference_role as string) ?? '',
              org: (profile.reference_org as string) ?? undefined,
              // The only field on this whole ladder that somebody other than
              // the teen put there. Drives rung 7 and confidence 'verified'.
              confirmedAt: (profile.reference_confirmed_at as string | null) ?? null,
            }
          : null,
      })

      setRung(result.rung)
      setAge((profile?.age as number) ?? null)
      onRung?.(result.rung)
      setStats({
        applied: events.filter((e) => e.applied_at).length,
        replied: events.filter((e) => e.first_response_at || e.outcome === 'interview' || e.outcome === 'hired').length,
        hired: events.filter((e) => e.outcome === 'hired' || e.status === 'hired').length,
      })

      // Cache for admin cohort reporting. Non-blocking, failure is harmless.
      void supabase.from('users').update({ current_rung: result.rung }).eq('id', user.id)
    } catch {
      /* dashboard still works without the card */
    }
    setLoading(false)
  }, [onRung])

  useEffect(() => {
    // Same convention as app/(app)/jobs/saved/page.tsx: `load` is async, so the
    // setState calls happen in a later tick, but the rule can't see that.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  if (loading || rung === null) return null

  const actions = nextActions(rung, age)

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      style={{
        background: 'var(--et-surface)',
        borderRadius: 'var(--radius-lg, 18px)',
        border: '1px solid var(--et-border)',
        padding: '18px 18px 16px',
        margin: '0 0 16px',
      }}
    >
      <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--et-placeholder)' }}>
        Where you are
      </p>

      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--et-ink)', letterSpacing: '-0.02em', marginTop: 4 }}>
        {RUNG_LABELS[rung]}
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: 4, lineHeight: 1.4 }}>
        {RUNG_BLURBS[rung]}
      </p>

      {/* Eight-rung track. Deliberately small — it orients without turning
          someone's situation into a progress bar they feel behind on. */}
      <div className="flex items-center gap-1.5" style={{ marginTop: 14 }} aria-hidden>
        {([0, 1, 2, 3, 4, 5, 6, 7] as Rung[]).map((r) => (
          <div
            key={r}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 2,
              background: r <= rung ? 'var(--et-blue)' : 'var(--et-ground)',
              opacity: r <= rung ? (r === rung ? 1 : 0.45) : 1,
            }}
          />
        ))}
      </div>
      <p className="sr-only">Step {rung + 1} of 8: {RUNG_LABELS[rung]}</p>

      <div className="flex flex-col gap-2" style={{ marginTop: 16 }}>
        <ActionButton action={actions.realistic} primary onNavigate={onNavigate} />
        <ActionButton action={actions.stretch} onNavigate={onNavigate} />
      </div>

      {stats.applied > 0 && (
        <div
          className="flex items-center gap-4"
          style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--et-border)' }}
        >
          <Stat n={stats.applied} label="applied" />
          <Stat n={stats.replied} label="replied" />
          <Stat n={stats.hired} label="hired" />
        </div>
      )}
    </motion.section>
  )
}

function ActionButton({ action, primary, onNavigate }: { action: NextAction; primary?: boolean; onNavigate?: (a: NextAction) => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onNavigate?.(action)}
      style={{
        textAlign: 'left',
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        background: primary ? 'var(--et-blue-light)' : 'var(--et-surface-2)',
        border: `1.5px solid ${primary ? 'transparent' : 'var(--et-border-mid)'}`,
        cursor: 'pointer',
      }}
    >
      <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: primary ? 'var(--et-blue)' : 'var(--et-ink)' }}>
        {action.label}
      </span>
      <span style={{ display: 'block', fontSize: '12px', color: 'var(--et-muted)', marginTop: 2, lineHeight: 1.35 }}>
        {action.detail}
      </span>
    </motion.button>
  )
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <span style={{ fontSize: '12px', color: 'var(--et-muted)' }}>
      <strong style={{ color: 'var(--et-ink)', fontWeight: 700 }}>{n}</strong> {label}
    </span>
  )
}
