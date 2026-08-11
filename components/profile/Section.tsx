'use client'

/**
 * EMPLOYTEENS — profile section furniture
 *
 * Two pieces, both taken from the Appybara profile Nayan sent.
 *
 * SECTIONHEAD. Theirs runs an icon in a tinted rounded square, then the section
 * name at display weight — "Academics", "Extracurriculars", "Awards". Ours used
 * 11px grey uppercase labels, which made every section look like a form
 * fieldset and gave the page no rhythm at all: you could not tell at a glance
 * where one thing ended and the next began. An icon plus a real heading costs
 * nothing and does the whole job.
 *
 * ADDTILE. The better idea on that page, and the one worth stealing outright.
 * Empty sections there are not hidden and do not say "Not set" — they show a
 * dashed "+ Add activity" button that occupies the same space the filled
 * version will. Three consequences: the page has the same shape on day one as
 * on day thirty, every gap is a tappable next step instead of a dead label, and
 * a teen can see what the finished thing is supposed to look like. Our old page
 * hid empty sections entirely, so a new user's profile was four items long and
 * gave no hint that anything else existed.
 *
 * The icons are inline SVG rather than an icon package: five glyphs is not
 * worth a dependency, and everything here has to work inside a Capacitor
 * WebView with no network.
 */

import { motion } from 'framer-motion'

type IconName = 'clock' | 'route' | 'compass' | 'spark' | 'doc' | 'shield'

const PATHS: Record<IconName, React.ReactNode> = {
  clock: (
    <>
      <circle cx="9" cy="9" r="6.6" strokeWidth="1.6" />
      <path d="M9 5.4V9l2.6 1.6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  route: (
    <>
      <circle cx="4.6" cy="4.6" r="2" strokeWidth="1.6" />
      <circle cx="13.4" cy="13.4" r="2" strokeWidth="1.6" />
      <path d="M6.6 4.6h3.3a2.5 2.5 0 0 1 0 5H8.1a2.5 2.5 0 0 0 0 5h3.3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  compass: (
    <>
      <circle cx="9" cy="9" r="6.6" strokeWidth="1.6" />
      <path d="M11.6 6.4 10.3 10.3 6.4 11.6 7.7 7.7Z" strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  spark: (
    <path d="M9 2.6 10.5 7 15 8.5 10.5 10 9 14.4 7.5 10 3 8.5 7.5 7Z" strokeWidth="1.6" strokeLinejoin="round" />
  ),
  doc: (
    <>
      <path d="M5 2.6h5l3.6 3.6v9.2H5Z" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 2.6v3.6h3.6M7 10h4M7 12.4h2.6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  shield: (
    <>
      <path d="M9 2.6 14.2 4.8v4c0 3.2-2.2 5.6-5.2 6.6-3-1-5.2-3.4-5.2-6.6v-4Z" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6.8 8.9 8.4 10.5l3-3.2" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
}

export function SectionHead({
  icon,
  title,
  action,
  onAction,
}: {
  icon: IconName
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex items-center gap-2.5" style={{ padding: '0 2px', marginBottom: 9 }}>
      <div
        style={{
          width: 28, height: 28, borderRadius: 9, flexShrink: 0,
          background: 'var(--et-blue-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--et-blue)" aria-hidden="true">
          {PATHS[icon]}
        </svg>
      </div>
      <h2 className="display" style={{ fontSize: '17px', flex: 1, minWidth: 0 }}>{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="press"
          style={{
            background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer',
            fontSize: '12.5px', fontWeight: 600, color: 'var(--et-blue)',
          }}
        >
          {action}
        </button>
      )}
    </div>
  )
}

/**
 * The empty state, as a button rather than a label.
 *
 * Dashed border and a plus, sized like the filled card it will become. `hint`
 * says what the teen gets out of doing it, not what the field is called —
 * "Employers ask this first" beats "Add availability", because the second one
 * is just the section heading again.
 */
export function AddTile({ label, hint, onClick }: { label: string; hint?: string; onClick?: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: 'none',
        border: '1.5px dashed var(--et-border-mid)',
        borderRadius: 18,
        padding: '15px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <span
        style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          background: 'var(--et-ground)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M6 1.6v8.8M1.6 6h8.8" stroke="var(--et-muted)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--et-subtle)' }}>{label}</span>
        {hint && (
          <span style={{ display: 'block', fontSize: '12px', color: 'var(--et-placeholder)', marginTop: 1, lineHeight: 1.4 }}>
            {hint}
          </span>
        )}
      </span>
    </motion.button>
  )
}

/** The filled counterpart to AddTile. Same padding and radius so swapping between them does not move the page. */
export function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--et-surface)',
        border: '1px solid var(--et-border)',
        borderRadius: 18,
        padding: '15px 16px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
