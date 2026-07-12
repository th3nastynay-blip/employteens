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
import { GIG_GUIDES, getProgramCalendar, WORKING_PAPERS_PROMPT } from '@/lib/get-ready'

const ease = [0.22, 1, 0.36, 1] as const

export function GetReadyMode({ age }: { age: number }) {
  const router = useRouter()
  const [unlockCount, setUnlockCount] = useState<number | null>(null)
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

  return (
    <div className="px-4 pb-2 flex flex-col gap-5">
      {/* ── Honest header ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="card-elevated px-5 py-5"
        style={{ background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)' }}
      >
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--et-blue)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
          Get Ready mode · Age {age}
        </p>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--et-ink)', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          Real talk: most employers start at 16.
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--et-subtle)', marginTop: 6, lineHeight: 1.5 }}>
          But you can earn money <strong>this week</strong> — no working papers needed for the gigs below. And when a verified {age}+ job appears, it shows up right here.
        </p>
      </motion.div>

      {/* ── Earn now ── */}
      <div>
        <p className="section-label mb-2">Earn now — no working papers needed</p>
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
