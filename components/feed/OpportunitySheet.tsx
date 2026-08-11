'use client'

/**
 * EMPLOYTEENS — opportunity detail sheet
 *
 * THE MISSING HALF. The Extracurriculars cards were rendering with no
 * onOpen handler, so tapping one did nothing at all: no description, no
 * eligibility, and — worst of it — no way to reach the application. We had
 * written descriptions for all 31 entries and verified all 31 links, and a
 * teen could see neither.
 *
 * Structure, in the order the decision actually gets made:
 *   1. Who runs it and what it is
 *   2. Can I do this — grade, region, papers
 *   3. What does it cost
 *   4. When does it close
 *   5. What do I walk away with
 *   6. Apply
 *
 * The apply button is fixed to the bottom so it is reachable without reading
 * to the end. A teen who already knows they want it should not have to scroll
 * past our writing to get out of the app.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { OrgLogo } from '@/components/ui/OrgLogo'
import { isVirtual, needsWorkingPapers, type FeedItem } from '@/lib/feed-filters'

const EVIDENCE_LINE: Record<string, string> = {
  reference: 'You finish with a named adult who will take a reference call. That is the strongest thing on this list.',
  title: 'You finish holding a real title you can put on an application.',
  award: 'A result you can name, with a placement other people can verify.',
  income: 'Paid work. Income plus a supervisor who can vouch for you.',
  hours: 'Logged, verifiable hours. Most programmes will write you a letter confirming them.',
  certificate: 'A certificate. Honest about what that is worth: it proves you turned up, not that anyone knows you.',
}

const GRADE_LABEL = (n: number) => (n === 13 ? 'college' : `grade ${n}`)

function costLine(item: FeedItem): { text: string; muted: boolean } {
  if (item.cost_unknown) return { text: 'Cost unconfirmed', muted: true }
  const cents = item.cost_cents as number | null | undefined
  if (cents === null || cents === 0) return { text: 'Free', muted: false }
  if (typeof cents === 'number') return { text: `$${Math.round(cents / 100)}`, muted: false }
  return { text: 'Cost unconfirmed', muted: true }
}

interface Props {
  item: FeedItem | null
  hasPapers?: boolean
  /** Out of season. Same reasoning as OpportunityCard — status is liveness. */
  upcoming?: boolean
  onClose: () => void
}

export function OpportunitySheet({ item, hasPapers, upcoming = false, onClose }: Props) {
  // Lock the page behind the sheet. Without this, a scroll gesture that runs
  // past the end of the sheet scrolls the list underneath it, which on a phone
  // feels like the app lost track of what you were looking at.
  useEffect(() => {
    if (!item) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [item])

  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  const cost = item ? costLine(item) : null
  const minG = item?.min_grade as number | null | undefined
  const maxG = item?.max_grade as number | null | undefined
  const regions = (item?.eligible_regions as string[] | null) ?? []
  const evidence = EVIDENCE_LINE[String(item?.evidence_kind ?? '')] ?? null
  const applyUrl = String(item?.apply_url ?? '')

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 90,
              background: 'rgba(15, 17, 21, 0.45)',
              backdropFilter: 'blur(3px)',
            }}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 91,
              maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              background: 'var(--et-surface)',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={String(item.title)}
          >
            {/* Grab handle */}
            <div style={{ padding: '10px 0 4px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 38, height: 4, borderRadius: 99, background: 'var(--et-border-mid)' }} />
            </div>

            <div style={{ overflowY: 'auto', padding: '8px 20px 20px', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              {/* ── Identity ── */}
              <div className="flex gap-3.5" style={{ alignItems: 'flex-start' }}>
                <OrgLogo src={item.logo_url as string | null} name={String(item.company)} size={54} radius={14} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 className="display display-md" style={{ lineHeight: 1.2 }}>{String(item.title)}</h2>
                  <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: 3 }}>{String(item.company)}</p>
                </div>
              </div>

              {/* ── Status strip ── */}
              <div className="flex flex-wrap gap-1.5" style={{ marginTop: 14 }}>
                <span className={`pill ${upcoming ? 'pill-amber' : 'pill-green'}`}>
                  <span className={`status-dot ${upcoming ? 'status-upcoming' : 'status-open'}`} style={{ marginRight: 0 }} />
                  {upcoming ? 'Not open yet' : 'Open now'}
                </span>
                <span className="pill">{isVirtual(item) ? 'Virtual' : String(item.location ?? 'In person')}</span>
                <span className={`pill ${cost!.muted ? 'pill-muted' : cost!.text === 'Free' ? 'pill-green' : ''}`}>
                  {cost!.text}
                </span>
                {!needsWorkingPapers(item) && hasPapers !== true && (
                  <span className="pill pill-green">No working papers needed</span>
                )}
              </div>

              {/* ── The description we actually wrote ── */}
              {item.description && (
                <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--et-subtle)', marginTop: 16 }}>
                  {String(item.description)}
                </p>
              )}

              {/* ── Facts ── */}
              <div style={{ marginTop: 20 }}>
                <p className="numbered-eyebrow" style={{ marginBottom: 10 }}>THE DETAILS</p>
                <Row
                  label="Who can apply"
                  value={
                    typeof minG === 'number' && typeof maxG === 'number'
                      ? `${GRADE_LABEL(minG)} to ${GRADE_LABEL(maxG)}`
                      : 'Not stated'
                  }
                />
                <Row
                  label="Where"
                  value={
                    regions.includes('GLOBAL') ? 'Open worldwide'
                      : regions.includes('US') ? 'United States'
                      : regions.length > 0 ? regions.map((r) => r.replace('US-', '')).join(', ')
                      : String(item.location ?? 'Not stated')
                  }
                />
                <Row label="Format" value={isVirtual(item) ? 'Virtual' : String(item.delivery ?? 'In person').replace('_', ' ')} />
                <Row label="Cost" value={cost!.text} muted={cost!.muted} />
                <Row
                  label="Timing"
                  value={
                    item.deadline
                      ? `Closes ${new Date(String(item.deadline)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                      : String(item.window_note ?? 'Rolling — no fixed deadline')
                  }
                />
              </div>

              {/* ── What it leaves you with ── */}
              {evidence && (
                <div className="grad-border" style={{ marginTop: 18, padding: 14 }}>
                  <p className="numbered-eyebrow" style={{ marginBottom: 6 }}>WHAT YOU WALK AWAY WITH</p>
                  <p style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--et-subtle)' }}>{evidence}</p>
                </div>
              )}

              {/* Honesty note. Deliberately not hidden in a tooltip. */}
              {!item.deadline && (
                <p style={{ fontSize: '11px', color: 'var(--et-placeholder)', marginTop: 14, lineHeight: 1.5 }}>
                  We show the recurring pattern rather than a hard date, because organisers move
                  their own deadlines. Check the site before you count on it.
                </p>
              )}
            </div>

            {/* ── Apply. Fixed, so it never needs to be scrolled to. ── */}
            <div
              style={{
                flexShrink: 0,
                padding: '12px 20px calc(16px + env(safe-area-inset-bottom))',
                borderTop: '1px solid var(--et-border)',
                background: 'var(--et-surface)',
                display: 'flex', gap: 10,
              }}
            >
              <button
                onClick={onClose}
                className="press"
                style={{
                  height: 50, padding: '0 18px', borderRadius: 14,
                  border: '1.5px solid var(--et-border-mid)', background: 'var(--et-surface)',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px',
                  color: 'var(--et-subtle)', cursor: 'pointer',
                }}
              >
                Close
              </button>
              <a
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="press"
                style={{
                  flex: 1, height: 50, borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'linear-gradient(135deg, var(--et-match-from), var(--et-match-to))',
                  color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.28)',
                }}
              >
                {upcoming ? 'See the details' : 'Apply now'}
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3h7v7M13 3L3.5 12.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div
      style={{
        display: 'flex', gap: 14, alignItems: 'baseline',
        padding: '9px 0', borderBottom: '1px solid var(--et-border)',
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--et-placeholder)', width: 106, flexShrink: 0, fontWeight: 600 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: '13.5px', lineHeight: 1.45,
          color: muted ? 'var(--et-placeholder)' : 'var(--et-ink)',
          fontWeight: muted ? 500 : 600,
        }}
      >
        {value}
      </span>
    </div>
  )
}
