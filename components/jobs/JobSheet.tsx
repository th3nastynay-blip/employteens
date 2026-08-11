'use client'

/**
 * EMPLOYTEENS — job detail sheet
 *
 * The jobs equivalent of OpportunitySheet, and deliberately the same shape: a
 * teen should not have to learn two interaction models for two tabs of the
 * same app. Grab handle, scrolling body, action pinned to the bottom.
 *
 * WHAT DIFFERS FROM THE OPPORTUNITY SHEET, AND WHY
 *
 *   - Fit factors get their own block, failures first. On an opportunity there
 *     is nothing to fit against; on a job it is the whole question.
 *   - The age line states WHOSE rule it is. "16+ by law, employer unconfirmed"
 *     is a different claim from "this employer hires at 16", and the card must
 *     not collapse them — that is the Eataly bug.
 *   - Apply is method-aware. Call, text and email listings open the dialler,
 *     Messages or Mail, so the button says which. A teen tapping "Apply" and
 *     having their phone start ringing is a bad surprise.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { OrgLogo } from '@/components/ui/OrgLogo'
import type { JobMatch } from '@/lib/types/database'
import type { FitFactor } from '@/lib/ai/match-engine'

interface Props {
  job: JobMatch | null
  fit?: FitFactor[]
  onClose: () => void
  onApply: (job: JobMatch) => void
  onSave?: (id: string) => void
  isSaved?: boolean
}

function payLine(job: JobMatch): string {
  const min = job.salary_min as number | null
  const max = job.salary_max as number | null
  const ok = (n: number | null): n is number => typeof n === 'number' && n > 0 && n <= 100
  if (ok(min) && ok(max) && min !== max) return `$${min}–$${max} an hour`
  if (ok(min)) return `$${min} an hour`
  if (ok(max)) return `$${max} an hour`
  return 'Not listed in the posting'
}

export function JobSheet({ job, fit, onClose, onApply, onSave, isSaved }: Props) {
  useEffect(() => {
    if (!job) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [job])

  useEffect(() => {
    if (!job) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [job, onClose])

  const method = job?.apply_method as 'url' | 'call' | 'text' | 'email' | undefined
  const applyLabel =
    method === 'call' ? 'Call to apply'
    : method === 'text' ? 'Text to apply'
    : method === 'email' ? 'Email to apply'
    : 'Apply now'

  // employer_min_age is only ever set when the posting stated an age or a
  // trusted source declared one. Null means we never checked.
  const employerKnown = typeof job?.employer_min_age === 'number'

  return (
    <AnimatePresence>
      {job && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              // Above .bottom-nav, which is z-index 100.
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(15,17,21,0.45)', backdropFilter: 'blur(3px)',
            }}
          />

          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            role="dialog" aria-modal="true" aria-label={String(job.title)}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 201,
              maxHeight: '90vh', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto',
              display: 'flex', flexDirection: 'column',
              background: 'var(--et-surface)',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 38, height: 4, borderRadius: 99, background: 'var(--et-border-mid)' }} />
            </div>

            <div style={{ overflowY: 'auto', padding: '8px 20px 20px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              <div className="flex gap-3.5" style={{ alignItems: 'flex-start' }}>
                <OrgLogo src={job.logo_url as string | null} name={String(job.company)} size={54} radius={14} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 className="display display-md" style={{ lineHeight: 1.2 }}>{String(job.title)}</h2>
                  <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: 3 }}>{String(job.company)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5" style={{ marginTop: 14 }}>
                {fit && fit.length > 0 && (
                  <span className={fit.every((f) => f.ok) ? 'pill pill-green' : 'pill pill-blue'}>
                    {fit.filter((f) => f.ok).length} of {fit.length} fit
                  </span>
                )}
                {employerKnown
                  ? <span className="pill pill-green">Ages {job.min_age}+</span>
                  : <span className="pill pill-muted">{job.min_age}+ by law · employer unconfirmed</span>}
                {job.experience_required === 'none' && <span className="pill pill-blue">No experience needed</span>}
                {job.hiring_speed_score >= 78 && <span className="pill pill-amber">Hires fast</span>}
              </div>

              {/* ── Fit, failures first ── */}
              {fit && fit.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p className="numbered-eyebrow" style={{ marginBottom: 10 }}>HOW IT FITS YOU</p>
                  <div className="flex flex-col gap-2">
                    {[...fit].sort((a, b) => Number(a.ok) - Number(b.ok)).map((f) => (
                      <div key={f.key} className="flex items-start gap-2.5">
                        {f.ok ? (
                          <svg width="15" height="15" viewBox="0 0 14 14" fill="none" style={{ marginTop: 2, flexShrink: 0 }}>
                            <circle cx="7" cy="7" r="6.5" fill="var(--et-green-light)" />
                            <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="var(--et-green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 14 14" fill="none" style={{ marginTop: 2, flexShrink: 0 }}>
                            <circle cx="7" cy="7" r="6.5" fill="var(--et-surface-2)" />
                            <path d="M7 4v4M7 10h.01" stroke="var(--et-placeholder)" strokeWidth="1.6" strokeLinecap="round" />
                          </svg>
                        )}
                        <span style={{ fontSize: '13.5px', lineHeight: 1.45, color: f.ok ? 'var(--et-subtle)' : 'var(--et-ink)' }}>
                          <strong style={{ fontWeight: f.ok ? 500 : 700 }}>{f.label}</strong>
                          {!f.ok && f.note ? ` — ${f.note}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Facts ── */}
              <div style={{ marginTop: 20 }}>
                <p className="numbered-eyebrow" style={{ marginBottom: 10 }}>THE DETAILS</p>
                <Row label="Pay" value={payLine(job)} muted={payLine(job).startsWith('Not')} />
                <Row label="Where" value={String(job.location ?? 'Not stated')} />
                {typeof job.distance_miles === 'number' && (
                  <Row label="Distance" value={job.distance_miles < 1 ? 'Under a mile' : `${job.distance_miles.toFixed(1)} miles`} />
                )}
                <Row
                  label="Minimum age"
                  value={employerKnown
                    ? `${job.min_age}+, stated by the employer`
                    : `${job.min_age}+ under state law. We have not confirmed this employer's own policy.`}
                  muted={!employerKnown}
                />
                <Row label="How to apply" value={
                  method === 'call' ? `Phone ${job.contact_phone ?? ''}`.trim()
                  : method === 'text' ? `Text ${job.contact_phone ?? ''}`.trim()
                  : method === 'email' ? `Email ${job.contact_email ?? ''}`.trim()
                  : 'Online application'
                } />
              </div>

              {job.description && (
                <div style={{ marginTop: 20 }}>
                  <p className="numbered-eyebrow" style={{ marginBottom: 8 }}>FROM THE POSTING</p>
                  <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--et-subtle)', whiteSpace: 'pre-line' }}>
                    {String(job.description).slice(0, 900)}
                    {String(job.description).length > 900 ? '…' : ''}
                  </p>
                </div>
              )}

              {job.contact_note && (
                <p style={{
                  fontSize: '12.5px', lineHeight: 1.5, color: 'var(--et-subtle)', marginTop: 16,
                  background: 'var(--et-blue-light)', padding: '10px 12px', borderRadius: 12,
                }}>
                  {String(job.contact_note)}
                </p>
              )}

              <p style={{ fontSize: '11px', color: 'var(--et-placeholder)', marginTop: 16, lineHeight: 1.5 }}>
                We re-check every application link. Postings still come down without warning —
                if this one has, tell us and it goes out of the feed.
              </p>
            </div>

            <div style={{
              flexShrink: 0, padding: '12px 20px calc(16px + env(safe-area-inset-bottom))',
              borderTop: '1px solid var(--et-border)', background: 'var(--et-surface)',
              display: 'flex', gap: 10,
            }}>
              {onSave && (
                <button
                  onClick={() => onSave(job.id)}
                  className="press"
                  aria-label={isSaved ? 'Remove from saved' : 'Save this job'}
                  style={{
                    width: 52, height: 50, borderRadius: 14, flexShrink: 0, cursor: 'pointer',
                    border: `1.5px solid ${isSaved ? 'rgba(37,99,235,0.3)' : 'var(--et-border-mid)'}`,
                    background: isSaved ? 'var(--et-blue-light)' : 'var(--et-surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M4 3H14C14.55 3 15 3.45 15 4V15.5L9 12.8L3 15.5V4C3 3.45 3.45 3 4 3Z"
                      fill={isSaved ? 'var(--et-blue)' : 'none'}
                      stroke={isSaved ? 'var(--et-blue)' : 'var(--et-muted)'}
                      strokeWidth="1.5" strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={() => onApply(job)}
                className="press"
                style={{
                  flex: 1, height: 50, borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, var(--et-match-from), var(--et-match-to))',
                  color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px',
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.28)',
                }}
              >
                {applyLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', padding: '9px 0', borderBottom: '1px solid var(--et-border)' }}>
      <span style={{ fontSize: '12px', color: 'var(--et-placeholder)', width: 100, flexShrink: 0, fontWeight: 600 }}>
        {label}
      </span>
      <span style={{
        fontSize: '13.5px', lineHeight: 1.45,
        color: muted ? 'var(--et-placeholder)' : 'var(--et-ink)',
        fontWeight: muted ? 500 : 600,
      }}>
        {value}
      </span>
    </div>
  )
}
