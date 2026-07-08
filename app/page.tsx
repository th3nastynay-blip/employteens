'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { RotatingHeadline } from '@/components/home/RotatingHeadline'

const ease = [0.22, 1, 0.36, 1] as const

function LogoMark() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <defs>
        <linearGradient id="lg0" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="52" height="52" rx="16" fill="url(#lg0)" />
      <path d="M29 9L17 28H25L23 43L35 24H27L29 9Z" fill="white" fillOpacity="0.95" />
    </svg>
  )
}

function MatchPreviewCard({
  score, title, company, detail, delay,
}: {
  score: number; title: string; company: string; detail: string; delay: number
}) {
  const circ = 2 * Math.PI * 20
  const offset = circ - (score / 100) * circ

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease, delay }}
      className="card flex items-center gap-4 px-4 py-3.5"
    >
      {/* Mini ring */}
      <div className="relative flex-shrink-0" style={{ width: 52, height: 52 }}>
        <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={`rg${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop stopColor="#2563EB" />
              <stop offset="1" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(37,99,235,0.10)" strokeWidth="5" />
          <motion.circle
            cx="26" cy="26" r="20"
            fill="none"
            stroke={`url(#rg${score})`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease, delay: delay + 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--et-blue)' }}>{score}%</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--et-ink)', letterSpacing: '-0.01em' }}>{title}</p>
        <p style={{ fontSize: '12px', color: 'var(--et-muted)', fontWeight: 500 }}>{company}</p>
        <p style={{ fontSize: '11px', color: 'var(--et-placeholder)', marginTop: '3px' }}>{detail}</p>
      </div>

      <div
        className="badge badge-match flex-shrink-0"
        style={{ fontSize: '10px', padding: '3px 8px' }}
      >
        Match
      </div>
    </motion.div>
  )
}

export default function HomePage() {
  const [stats, setStats] = useState<{ active_jobs: number; verified_today: number } | null>(null)

  useEffect(() => {
    fetch('/api/public-stats')
      .then((r) => r.json())
      .then((d) => { if (d?.active_jobs > 0) setStats(d) })
      .catch(() => { /* line just doesn't render */ })
  }, [])

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--et-surface)' }}>
      <div className="flex-1 flex flex-col px-6 pt-14 pb-10 max-w-sm mx-auto w-full">

        {/* Logo mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease }}
          className="mb-10"
        >
          <LogoMark />
        </motion.div>

        {/* Headline — rotates through ~15 lines, accent line stays brand purple */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease, delay: 0.08 }}
          className="mb-8"
        >
          <RotatingHeadline />
          <p style={{
            marginTop: '14px',
            fontSize: '16px',
            color: 'var(--et-subtle)',
            lineHeight: 1.55,
            fontWeight: 400,
          }}>
            AI finds part-time jobs that fit your school, location, and age — automatically.
          </p>
        </motion.div>

        {/* Live match previews */}
        <div className="flex flex-col gap-2.5 mb-8">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="section-label mb-1"
          >
            How your matches will look
          </motion.p>

          <MatchPreviewCard score={96} title="Crew Member" company="Chipotle Mexican Grill" detail="After school · 0.3 mi · Ages 16+" delay={0.25} />
          <MatchPreviewCard score={89} title="Barista" company="Starbucks" detail="Weekends · 0.7 mi · Flexible hours" delay={0.35} />
          <MatchPreviewCard score={82} title="Sales Associate" company="Target" detail="Evenings · 1.1 mi · Hires fast" delay={0.45} />

          {/* Real number from /api/public-stats — never a made-up count */}
          {stats && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ fontSize: '12px', color: 'var(--et-placeholder)', textAlign: 'center', marginTop: '4px' }}
            >
              {stats.active_jobs.toLocaleString()} verified jobs live right now
              {stats.verified_today > 0 ? ` · ${stats.verified_today.toLocaleString()} checked today` : ''}
            </motion.p>
          )}
        </div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.5 }}
          className="flex flex-col gap-3"
        >
          <Link href="/signup" className="w-full">
            <button className="btn-primary w-full" style={{ height: '54px', fontSize: '16px', borderRadius: 'var(--radius-lg)' }}>
              Find my matches — free
            </button>
          </Link>
          <Link href="/login" className="w-full">
            <button className="btn-secondary w-full" style={{ height: '54px', fontSize: '15px', borderRadius: 'var(--radius-lg)' }}>
              Sign in
            </button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{ marginTop: '20px', fontSize: '12px', color: 'var(--et-placeholder)', textAlign: 'center' }}
        >
          For teens 14–19 in New York &amp; New Jersey
        </motion.p>

      </div>
    </main>
  )
}
