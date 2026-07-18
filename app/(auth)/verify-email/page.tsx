'use client'

import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

const ease = [0.22, 1, 0.36, 1] as const

function LogoMark() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" width={40} height={40} alt="EmployTeens" style={{ borderRadius: 11, display: 'block' }} />
}

function VerifyEmailContent() {
  const params = useSearchParams()
  const email = params.get('email') ?? 'your email'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--et-surface)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="w-full max-w-sm flex flex-col items-center text-center gap-8"
      >
        <Link href="/"><LogoMark /></Link>

        {/* Email illustration */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, ease }}
          style={{
            width: 80, height: 80, borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(37,99,235,0.12)',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <defs>
              <linearGradient id="mailGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2563EB" /><stop offset="1" stopColor="#7C3AED" />
              </linearGradient>
            </defs>
            <rect x="3" y="8" width="30" height="20" rx="3" stroke="url(#mailGrad)" strokeWidth="2" />
            <path d="M3 11L18 20L33 11" stroke="url(#mailGrad)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, ease }}
          className="flex flex-col gap-3"
        >
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--et-ink)' }}>
            Check your inbox
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--et-muted)', lineHeight: 1.6 }}>
            We sent a confirmation link to{' '}
            <strong style={{ color: 'var(--et-ink)' }}>{email}</strong>.
            Click it to activate your account and get to your matches.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, ease }}
          className="w-full flex flex-col gap-3"
        >
          {[
            { n: '1', text: 'Open the email from EmployTeens' },
            { n: '2', text: 'Click the "Confirm your account" link' },
            { n: '3', text: "You'll be brought straight to onboarding" },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-center gap-3 text-left">
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'var(--et-blue-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--et-blue)' }}>{n}</span>
              </div>
              <span style={{ fontSize: '14px', color: 'var(--et-subtle)' }}>{text}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="w-full flex flex-col gap-3"
        >
          <p style={{ fontSize: '13px', color: 'var(--et-placeholder)' }}>
            Didn&apos;t get it? Check spam, or{' '}
            <Link href="/signup" style={{ color: 'var(--et-blue)', fontWeight: 600 }}>
              try a different email
            </Link>
          </p>
          <Link href="/login">
            <button className="btn-secondary w-full" style={{ borderRadius: 'var(--radius-lg)', fontSize: '14px', height: 46 }}>
              Back to sign in
            </button>
          </Link>
        </motion.div>
      </motion.div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}
