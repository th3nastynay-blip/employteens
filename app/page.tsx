'use client'

/**
 * EMPLOYTEENS — marketing page
 *
 * Rebuilt on the Cal AI landing page Nayan sent. What travels from it:
 *
 *   A ROW OF PHONES, ONE PER STEP, each under a four-word caption. It explains
 *   the product faster than any paragraph because you see the actual screens in
 *   the actual order you would meet them. Ours: tell us your hours -> see what
 *   fits -> know where you stand -> get someone to vouch. That last one is the
 *   step no other teen job app has, so it gets the last frame, which is the one
 *   people remember.
 *
 *   ROOM. Cal AI's page is mostly empty space at a light neutral, with the
 *   devices doing all the work. Ours was a 384px column with three fake match
 *   cards stacked in it, so on a laptop — which is how anyone judging this
 *   opens it — the whole product appeared as a narrow sliver against a field of
 *   white, and it read as unfinished before a word was read.
 *
 * WHAT DOES NOT TRAVEL: their social proof. Cal AI can run "1M+ downloads"
 * because it is true for them. We have no such number, so this page has no user
 * count, no star rating and no testimonial. The single quantitative claim comes
 * from /api/public-stats and renders only when the API returns something real.
 * Both because inventing it is illegal under the FTC endorsement rule and
 * App Store 2.3, and because a product that tells 15-year-olds not to pad a
 * resume does not get to pad its own homepage.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { RotatingHeadline } from '@/components/home/RotatingHeadline'
import {
  PhoneFrame,
  ScreenAvailability,
  ScreenFeed,
  ScreenLadder,
  ScreenVouch,
} from '@/components/home/PhoneFrame'

const ease = [0.22, 1, 0.36, 1] as const

function LogoMark() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" width={44} height={44} alt="EmployTeens" style={{ borderRadius: 13, display: 'block' }} />
}

const STEPS = [
  { caption: 'Tell us your hours', tab: 4, screen: <ScreenAvailability /> },
  { caption: 'See what fits', tab: 0, screen: <ScreenFeed /> },
  { caption: 'Know where you stand', tab: 4, screen: <ScreenLadder /> },
  { caption: 'Get someone to vouch', tab: 4, screen: <ScreenVouch /> },
]

export default function HomePage() {
  const [stats, setStats] = useState<{ active_jobs: number; verified_today: number } | null>(null)

  useEffect(() => {
    fetch('/api/public-stats')
      .then((r) => r.json())
      .then((d) => { if (d?.active_jobs > 0) setStats(d) })
      .catch(() => { /* the line simply does not render */ })
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--et-surface)' }}>

      {/* ── Nav ── */}
      <header
        style={{
          maxWidth: 1120, margin: '0 auto', width: '100%',
          padding: 'max(20px, env(safe-area-inset-top)) 24px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <LogoMark />
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--et-subtle)' }}>Log in</span>
        </Link>
      </header>

      {/* ── Hero ── */}
      <section
        style={{
          maxWidth: 720, margin: '0 auto', width: '100%',
          padding: '52px 24px 0', textAlign: 'center',
        }}
      >
        {/* NOT wrapped in motion, and that is deliberate.
            `initial={{opacity:0}}` renders the hero invisible and depends on JS
            to reveal it. On the one page whose entire job is a first
            impression, that means a blank screen for anyone on a slow
            connection, with JS blocked, or on a crawler generating a link
            preview — the headline is also the SEO and social-card text. The
            rotating headline supplies plenty of motion once JS arrives; the
            words themselves are visible from first paint either way. */}
        <div>
          <RotatingHeadline />
          <p
            style={{
              marginTop: 18, fontSize: '17px', lineHeight: 1.55,
              color: 'var(--et-subtle)', maxWidth: 460, marginLeft: 'auto', marginRight: 'auto',
            }}
          >
            Part-time jobs in Hudson County and NYC, filtered by what you are actually
            old enough and free enough to do.
          </p>
        </div>

        <div
          style={{ marginTop: 28, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <Link href="/signup" style={{ textDecoration: 'none' }}>
            <button
              className="press"
              style={{
                height: 52, padding: '0 30px', borderRadius: 99, border: 'none', cursor: 'pointer',
                background: 'var(--et-ink)', color: '#fff',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15.5px',
                boxShadow: '0 6px 20px rgba(15,17,21,0.18)',
              }}
            >
              Start free
            </button>
          </Link>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button
              className="press"
              style={{
                height: 52, padding: '0 26px', borderRadius: 99, cursor: 'pointer',
                background: 'var(--et-surface)', border: '1.5px solid var(--et-border-mid)',
                color: 'var(--et-subtle)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15.5px',
              }}
            >
              I have an account
            </button>
          </Link>
        </div>

        {/* The only number on this page, and only when it is real. */}
        {stats && (
          <p style={{ marginTop: 18, fontSize: '12.5px', color: 'var(--et-placeholder)' }}>
            {stats.active_jobs} openings live right now
            {stats.verified_today > 0 ? ` · ${stats.verified_today} link-checked today` : ''}
          </p>
        )}
      </section>

      {/* ── The phones ──
          Horizontally scroll-snapped below ~1100px so four 218px frames plus
          gaps never squash. On a laptop they land in one row, which is the
          whole point of the layout. */}
      <section style={{ marginTop: 56 }}>
        <div
          className="scrollbar-hide"
          style={{
            display: 'flex', gap: 26, justifyContent: 'center',
            overflowX: 'auto', scrollSnapType: 'x mandatory',
            padding: '4px 24px 8px',
            WebkitOverflowScrolling: 'touch',
          } as React.CSSProperties}
        >
          {STEPS.map((s, i) => (
            <PhoneFrame key={s.caption} caption={s.caption} index={i} activeTab={s.tab}>
              {s.screen}
            </PhoneFrame>
          ))}
        </div>
        <p
          style={{
            textAlign: 'center', fontSize: '11px', color: 'var(--et-placeholder)',
            marginTop: 20, padding: '0 24px',
          }}
        >
          Screens shown for illustration. Listings, distances and pay come from real postings.
        </p>
      </section>

      {/* ── The one claim worth making ──
          Not a feature grid. Three feature tiles would say the same thing every
          job board says; this says the thing none of them can. */}
      <section
        style={{
          maxWidth: 620, margin: '0 auto', width: '100%',
          padding: '72px 24px 0', textAlign: 'center',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease }}
        >
          <p className="numbered-eyebrow" style={{ marginBottom: 12 }}>WHY THIS ONE</p>
          <h2 className="display display-lg" style={{ lineHeight: 1.22 }}>
            Nobody hires a teenager because of a resume. They hire because an adult
            said you were worth it.
          </h2>
          <p style={{ marginTop: 16, fontSize: '15.5px', lineHeight: 1.6, color: 'var(--et-subtle)' }}>
            So the app is built around getting you that person. It tracks what you have
            actually done, tells you the next real step, and makes asking someone to
            vouch for you a single link they tap once. No account for them, no signup,
            no being added to a mailing list.
          </p>
        </motion.div>
      </section>

      {/* ── Close ── */}
      <section style={{ padding: '64px 24px 0', textAlign: 'center' }}>
        <Link href="/signup" style={{ textDecoration: 'none' }}>
          <button
            className="press"
            style={{
              height: 54, padding: '0 34px', borderRadius: 99, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--et-match-from), var(--et-match-to))',
              color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px',
              boxShadow: '0 8px 26px rgba(37,99,235,0.30)',
            }}
          >
            Make your profile
          </button>
        </Link>
        <p style={{ marginTop: 12, fontSize: '12.5px', color: 'var(--et-placeholder)' }}>
          Free. Built for 14 to 19 in NJ and NY.
        </p>
      </section>

      <footer
        style={{
          marginTop: 72, padding: '24px 24px calc(28px + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--et-border)',
          display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap',
        }}
      >
        <a href="/privacy" style={{ fontSize: '12px', color: 'var(--et-placeholder)' }}>Privacy</a>
        <a href="/terms" style={{ fontSize: '12px', color: 'var(--et-placeholder)' }}>Terms</a>
        <a href="/support" style={{ fontSize: '12px', color: 'var(--et-placeholder)' }}>Support</a>
      </footer>
    </main>
  )
}
