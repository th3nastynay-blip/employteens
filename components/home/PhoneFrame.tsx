'use client'

/**
 * EMPLOYTEENS — device mockups for the marketing page
 *
 * Modelled on Cal AI's landing page: a row of phones, one per step, each under
 * a four-word caption. It works because it answers "what is this" in about two
 * seconds without a single paragraph, and because each frame shows the app
 * doing the specific thing the caption names rather than a generic hero shot.
 *
 * BUILT IN CSS, NOT SCREENSHOTTED, and that is a deliberate trade.
 *
 *   Against: these are hand-built approximations, so they can drift from the
 *   real screens as the app changes. Real captures cannot drift.
 *
 *   For: a screenshot is a binary asset that has to be re-taken on every UI
 *   change, at 3x, on a device, and then committed — which in practice means it
 *   is re-taken never and the landing page shows a version of the product that
 *   stopped existing months ago. These use the same CSS variables as the app,
 *   so a token change moves them automatically, they stay sharp at any DPR, and
 *   they add nothing to the page weight.
 *
 * NOTHING IN HERE MAY STATE A FACT WE CANNOT BACK. The cards show role titles
 * and distances as ILLUSTRATION, and the section says so in as many words. No
 * invented user counts, no fake testimonials, no "4.9 stars from 12,000 teens".
 * The only real number on this page comes from /api/public-stats. FTC's
 * endorsement rule and App Store 2.3 both bite here, and more to the point a
 * product telling teens to be honest on a resume cannot lie on its own homepage.
 */

import { motion } from 'framer-motion'

/**
 * The app's own tab bar, miniaturised.
 *
 * Added because the first build left each screen's content floating in the top
 * half of a 396px frame with 180px of blank white under it, which reads as an
 * unfinished screen rather than a spacious one. A tab bar anchors the bottom,
 * fills the space with something true (the app really does have five tabs), and
 * tells a first-time visitor how big the product is without a word of copy.
 */
function MiniTabBar({ active }: { active: number }) {
  // Five glyphs at 11px. Simplified to single strokes because detail at this
  // size turns to mud.
  const icons = [
    'M2 3.5h3.4v3.4H2ZM7.6 3.5H11v3.4H7.6ZM2 9.1h3.4v3.4H2ZM7.6 9.1H11v3.4H7.6Z',
    'M6.5 1.6 11.4 6.5 6.5 11.4 1.6 6.5Z',
    'M3.2 1.8h6.6v9.6L6.5 9.6 3.2 11.4Z',
    'M6.5 1.8a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4Zm0 2.6v2.5l1.8 1.1',
    'M6.5 1.8a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8ZM1.9 11.4c0-2.3 2.1-3.6 4.6-3.6s4.6 1.3 4.6 3.6',
  ]
  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: '1px solid var(--et-border)',
        background: 'rgba(255,255,255,0.92)',
        padding: '7px 8px 10px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}
    >
      {icons.map((d, i) => (
        <svg
          key={i}
          width="13" height="13" viewBox="0 0 13 13" fill="none"
          stroke={i === active ? 'var(--et-blue)' : 'var(--et-placeholder)'}
          strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"
          aria-hidden="true"
        >
          <path d={d} />
        </svg>
      ))}
    </div>
  )
}

export function PhoneFrame({
  caption,
  index,
  activeTab,
  children,
}: {
  caption: string
  index: number
  /** Which of the five tabs this screen lives under. */
  activeTab: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.09, ease: [0.22, 1, 0.36, 1] }}
      style={{ flexShrink: 0, width: 218, scrollSnapAlign: 'center' }}
    >
      <p
        className="display"
        style={{ fontSize: '15px', textAlign: 'center', marginBottom: 14, letterSpacing: '-0.01em' }}
      >
        {caption}
      </p>

      {/* Bezel. A real phone's bezel is nearly black and thin; going thicker or
          adding a chrome band is what makes a mockup look like a stock image. */}
      <div
        style={{
          borderRadius: 34,
          padding: 7,
          background: 'linear-gradient(160deg, #2A2A2E, #131316)',
          boxShadow: '0 18px 44px rgba(15,17,21,0.16), 0 3px 10px rgba(15,17,21,0.10)',
        }}
      >
        <div
          style={{
            borderRadius: 27,
            overflow: 'hidden',
            background: 'var(--et-surface)',
            height: 356,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Dynamic-island-ish pill. Small enough to read as a phone, not so
              literal that it dates the mockup to one hardware generation. */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, flexShrink: 0 }}>
            <div style={{ width: 54, height: 15, borderRadius: 99, background: '#131316' }} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '10px 12px 0' }}>
            {children}
          </div>
          <MiniTabBar active={activeTab} />
        </div>
      </div>
    </motion.div>
  )
}

/* ── Screen contents ───────────────────────────────────────────────────
   Each of these is one screen of the real app, reduced to the two or three
   elements that carry its meaning. Anything smaller than ~9px is dropped
   rather than shrunk, because illegible micro-text is what makes a mockup
   read as filler. */

export function ScreenAvailability() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const on = [false, true, true, false, true, true, true]
  return (
    <div>
      <p className="numbered-eyebrow" style={{ marginBottom: 4 }}>ABOUT YOU</p>
      <p className="display" style={{ fontSize: '15px', lineHeight: 1.25, marginBottom: 12 }}>
        When can you<br />work?
      </p>
      <div style={{ display: 'flex', gap: 4 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: '8px', fontWeight: 700, color: 'var(--et-placeholder)', marginBottom: 3 }}>{d}</p>
            <div
              style={{
                height: 26, borderRadius: 7,
                background: on[i] ? 'linear-gradient(180deg,var(--et-match-from),var(--et-match-to))' : 'var(--et-ground)',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: '9px 10px', borderRadius: 12, background: 'var(--et-surface-2)' }}>
        <p style={{ fontSize: '9.5px', color: 'var(--et-muted)', lineHeight: 1.45 }}>
          School ends 2:45pm. We only show shifts that start after that.
        </p>
      </div>
      <div style={{ marginTop: 10, height: 34, borderRadius: 11, background: 'var(--et-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>Continue</span>
      </div>
    </div>
  )
}

export function ScreenFeed() {
  const rows = [
    { t: 'Crew Member', c: 'Chipotle', d: '0.3 mi · after school', color: '#A81612', i: 'C' },
    { t: 'Barista', c: 'Starbucks', d: '0.7 mi · weekends', color: '#00704A', i: 'S' },
    { t: 'Sales Associate', c: 'Target', d: '1.1 mi · evenings', color: '#CC0000', i: 'T' },
  ]
  return (
    <div>
      <p className="numbered-eyebrow" style={{ marginBottom: 4 }}>YOUR FEED</p>
      <p className="display" style={{ fontSize: '15px', marginBottom: 10 }}>Fits your hours</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rows.map((r) => (
          <div
            key={r.t}
            style={{
              border: '1px solid var(--et-border)', borderRadius: 12, padding: '8px 9px',
              display: 'flex', gap: 8, alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: r.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 800, color: '#fff',
              }}
            >
              {r.i}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--et-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.t}</p>
              <p style={{ fontSize: '9px', color: 'var(--et-muted)', marginTop: 1 }}>{r.d}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '8.5px', fontWeight: 700, padding: '3px 7px', borderRadius: 99, background: 'var(--et-green-light)', color: 'var(--et-green)' }}>No experience</span>
        <span style={{ fontSize: '8.5px', fontWeight: 700, padding: '3px 7px', borderRadius: 99, background: 'var(--et-blue-light)', color: 'var(--et-blue)' }}>Hires at 16</span>
      </div>
    </div>
  )
}

export function ScreenLadder() {
  const bars = [0, 1, 2, 3, 4, 5, 6, 7]
  const at = 3
  return (
    <div>
      <p className="numbered-eyebrow" style={{ marginBottom: 4 }}>WHERE YOU ARE</p>
      <p className="display" style={{ fontSize: '15px', marginBottom: 12 }}>Rung 3 of 7</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3.5, height: 62 }}>
        {bars.map((b) => (
          <div key={b} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%' }}>
            <div
              style={{
                width: '100%',
                height: `${28 + b * 10.2}%`,
                borderRadius: 4,
                background: b === at
                  ? 'linear-gradient(180deg,var(--et-match-from),var(--et-match-to))'
                  : b < at ? 'rgba(37,99,235,0.26)' : 'var(--et-ground)',
              }}
            />
          </div>
        ))}
      </div>
      <p className="display" style={{ fontSize: '13px', marginTop: 12 }}>Someone will vouch</p>
      <p style={{ fontSize: '9.5px', color: 'var(--et-subtle)', marginTop: 4, lineHeight: 1.5 }}>
        An adult would vouch for you. That is the thing employers actually want.
      </p>
    </div>
  )
}

export function ScreenVouch() {
  return (
    <div>
      <p className="numbered-eyebrow" style={{ marginBottom: 4 }}>YOUR REFERENCE</p>
      <p className="display" style={{ fontSize: '15px', lineHeight: 1.25, marginBottom: 10 }}>
        Ms. Reyes<br />vouched for you
      </p>
      <div
        style={{
          borderRadius: 13, padding: '10px 11px',
          background: 'var(--et-green-light)', border: '1px solid rgba(22,163,74,0.18)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="var(--et-green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--et-green)', letterSpacing: '0.04em' }}>CONFIRMED</span>
        </div>
        <p style={{ fontSize: '9.5px', color: 'var(--et-subtle)', lineHeight: 1.5 }}>
          Confirmed as your supervisor at the branch library.
        </p>
      </div>
      <p style={{ fontSize: '9.5px', color: 'var(--et-muted)', marginTop: 11, lineHeight: 1.5 }}>
        The only part of your profile someone other than you has confirmed, which is
        exactly why it is worth the most.
      </p>
    </div>
  )
}
