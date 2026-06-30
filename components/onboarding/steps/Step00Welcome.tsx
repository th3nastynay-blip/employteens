'use client'

import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'

const ease = [0.22, 1, 0.36, 1] as const

export function Step00Welcome() {
  const nextStep = useOnboardingStore((s) => s.nextStep)

  return (
    <div className="w-full max-w-sm flex flex-col items-center text-center gap-8">
      {/* Logo mark */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
      >
        <svg width="72" height="72" viewBox="0 0 52 52" fill="none">
          <defs>
            <linearGradient id="wlLg" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2563EB" />
              <stop offset="1" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          <rect width="52" height="52" rx="16" fill="url(#wlLg)" />
          <path d="M29 9L17 28H25L23 43L35 24H27L29 9Z" fill="white" fillOpacity="0.95" />
        </svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, ease }}
        className="flex flex-col gap-3"
      >
        <h1 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.08, color: 'var(--et-ink)' }}>
          Find your first job.<br />
          <span className="match-gradient-text">We'll do the work.</span>
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--et-muted)', lineHeight: 1.55 }}>
          EmployTeens matches you with real jobs near you — automatically, every day.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, ease }}
        className="w-full flex flex-col gap-2.5"
      >
        {[
          'Takes about 2 minutes',
          'No experience required',
          'Built for teens 14–19 in NY/NJ',
        ].map((item, i) => (
          <div key={item} className="flex items-center gap-3">
            <div style={{
              width: 22, height: 22, borderRadius: 7, flexShrink: 0,
              background: 'var(--et-blue-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="var(--et-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: '14px', color: 'var(--et-subtle)', fontWeight: 500 }}>{item}</span>
          </div>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, ease }}
        whileTap={{ scale: 0.97 }}
        onClick={nextStep}
        className="btn-primary w-full"
        style={{ height: 52, borderRadius: 'var(--radius-lg)', fontSize: '16px' }}
      >
        Let&apos;s go →
      </motion.button>
    </div>
  )
}
