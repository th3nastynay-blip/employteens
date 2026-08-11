'use client'

/**
 * EMPLOYTEENS — Get Ready mode (ages 14–15)
 *
 * Shown on the dashboard for younger teens instead of a confusing near-empty
 * feed. Honest about the market (most employers start at 16), then useful:
 *   1. Earn-now gigs that need NO working papers — each card opens the AI
 *      Coach with a tailored how-to-start prompt
 *   2. Seasonal city program calendar (the real 14–15 employers)
 *   3. Working-papers walkthrough
 *   4. Real count of what unlocks at 16 — reason to stay
 * Any real min_age-eligible listings still render in the normal feed below.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GIG_GUIDES, getProgramCalendar, WORKING_PAPERS_PROMPT } from '@/lib/get-ready'

const ease = [0.22, 1, 0.36, 1] as const

export function GetReadyMode({ age, hasPapers, onPapers }: {
  age: number
  /** null = never asked. Distinct from false. */
  hasPapers?: boolean | null
  onPapers?: () => void
}) {
  const router = useRouter()
  const [unlockCount, setUnlockCount] = useState<number | null>(null)
  const [savingPapers, setSavingPapers] = useState(false)
  const [gotPapers, setGotPapers] = useState<boolean>(hasPapers === true)
  const programs = getProgramCalendar()
  const currentMonth = new Date().getMonth() + 1

  useEffect(() => {
    fetch('/api/public-stats')
      .then((r) => r.json())
      .then((d) => { if (d?.active_jobs > 0) setUnlockCount(d.active_jobs) })
      .catch(() => { /* counter just doesn't render */ })
  }, [])

  function askCoach(prompt: string) {
    router.push(`/career?ask=${encodeURIComponent(prompt)}`)
  }

  /**
   * THE MISSING WRITE.
   *
   * has_working_papers is read in four places — this card, the unified feed,
   * the Extracurriculars page and the rung detector — and until now NOTHING
   * in the app ever set it. Not one of the thirteen onboarding steps asks, and
   * this card explained how to GET papers without ever offering a way to say
   * you had them. So the column stayed null for every user and rung 0 was a
   * dead end by construction: the ladder could be read but never climbed.
   */
  async function markPapers() {
    setSavingPapers(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('users').update({
          has_working_papers: true,
          working_papers_at: new Date().toISOString().slice(0, 10),
        }).eq('id', user.id)
        setGotPapers(true)
        onPapers?.()
      }
    } catch { /* button stays up so they can retry */ }
    setSavingPapers(false)
  }

  return (
    <div className="px-4 pb-2 flex flex-col gap-5">
      {/* ── Earn now ──
          The competing header that used to sit here ("Real talk: most employers
          start at 16") was removed during consolidation. RungCard above already
          says where the teen stands, and two cards making the same point back
          to back read as an app arguing with itself. Its one genuinely useful
          line survives as this section's subtitle. */}
      <div>
        <p className="section-label mb-1">Earn now — no working papers needed</p>
        <p style={{ fontSize: '13px', color: 'var(--et-muted)', lineHeight: 1.45, marginBottom: 10 }}>
          You can earn money <strong>this week</strong> with these. None of them need papers,
          and none of them wait for you to turn 16.
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {GIG_GUIDES.map((gig, i) => (
            <motion.button
              key={gig.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, ease }}
              whileTap={{ scale: 0.97 }}
              onClick={() => askCoach(gig.coachPrompt)}
              className="card px-3.5 py-3.5 text-left"
              style={{ cursor: 'pointer', border: '1px solid var(--et-border)' }}
            >
              <div style={{ fontSize: '22px', marginBottom: 6 }}>{gig.emoji}</div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--et-ink)', letterSpacing: '-0.01em' }}>{gig.title}</p>
              <p style={{ fontSize: '12px', color: 'var(--et-muted)', marginTop: 3, lineHeight: 1.4 }}>{gig.blurb}</p>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--et-green)', marginTop: 6 }}>{gig.pay}</p>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--et-blue)', marginTop: 4 }}>
                Ask Coach how to start →
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Program season calendar ── */}
      {programs.length > 0 && (
        <div>
          <p className="section-label mb-2">City programs that hire at 15 — application windows</p>
          <div className="card-elevated overflow-hidden">
            {programs.map((p, i) => {
              // In the window = the listing is ALREADY in their feed (the
              // ingest activates/deactivates by these same months). Past
              // start-month but outside the window means it's over for the
              // year — say when it comes back, never point at nothing.
              const isOpen = p.activeMonths.includes(currentMonth)
              return (
                <div
                  key={`${p.company}-${p.title}`}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderTop: i > 0 ? '1px solid var(--et-border)' : 'none' }}
                >
                  <div>
                    <p style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--et-ink)' }}>{p.title}</p>
                    <p style={{ fontSize: '12px', color: 'var(--et-muted)', marginTop: 1 }}>{p.company} · {p.city} · Ages {p.min_age}+</p>
                  </div>
                  <span
                    className="badge"
                    style={{
                      fontSize: '11px', flexShrink: 0, marginLeft: 8,
                      background: isOpen ? 'var(--et-green-light)' : 'var(--et-surface-2)',
                      color: isOpen ? 'var(--et-green)' : 'var(--et-muted)',
                    }}
                  >
                    {isOpen ? 'In your feed now ↓' : `Opens ${p.monthLabel}`}
                  </span>
                </div>
              )
            })}
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--et-placeholder)', marginTop: 6, paddingLeft: 2 }}>
            No searching needed — each one appears in your feed below the moment its window opens.
          </p>
        </div>
      )}

      {/* ── Working papers ── */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => askCoach(WORKING_PAPERS_PROMPT)}
        className="card px-4 py-4 text-left flex items-center gap-3.5"
        style={{ cursor: 'pointer' }}
      >
        <div style={{ fontSize: '24px' }}>📄</div>
        <div className="flex-1">
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--et-ink)' }}>
            Get your NJ working papers now
          </p>
          <p style={{ fontSize: '12px', color: 'var(--et-muted)', marginTop: 2, lineHeight: 1.4 }}>
            Free, online at MyWorkingPapers.nj.gov. Having them ready makes you the fastest hire when a job opens.
          </p>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--et-blue)', fontWeight: 600 }}>→</span>
      </motion.button>

      {/* Self-reported, and labelled as such everywhere downstream — we never
          see the certificate. Still worth asking, because "do you have them"
          is the single question that decides whether anything else we show is
          actionable. */}
      {!gotPapers ? (
        <button
          onClick={markPapers}
          disabled={savingPapers}
          className="press"
          style={{
            width: '100%', height: 46, borderRadius: 13,
            background: 'var(--et-surface)', border: '1.5px solid var(--et-border-mid)',
            color: 'var(--et-subtle)', fontFamily: 'var(--font-display)',
            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            opacity: savingPapers ? 0.6 : 1,
          }}
        >
          {savingPapers ? 'Saving…' : 'I already have my working papers'}
        </button>
      ) : (
        <div
          className="card px-4 py-3.5 flex items-center gap-2.5"
          style={{ background: 'var(--et-green-light)', border: 'none' }}
        >
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="var(--et-green)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--et-green)' }}>
            Working papers on file — you can apply to anything you are old enough for
          </p>
        </div>
      )}

      {/* ── Unlock counter ── */}
      {unlockCount !== null && (
        <div
          className="card px-4 py-3.5 text-center"
          style={{ background: 'var(--et-surface-2)', border: '1px dashed var(--et-border-mid)' }}
        >
          <p style={{ fontSize: '13px', color: 'var(--et-subtle)' }}>
            <strong style={{ color: 'var(--et-ink)' }}>{unlockCount.toLocaleString()} verified jobs</strong> unlock at 16 — every one already checked and waiting.
          </p>
        </div>
      )}
    </div>
  )
}
