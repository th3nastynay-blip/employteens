'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ease = [0.22, 1, 0.36, 1] as const

function LogoMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 52 52" fill="none">
      <defs>
        <linearGradient id="suLg" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="52" height="52" rx="16" fill="url(#suLg)" />
      <path d="M29 9L17 28H25L23 43L35 24H27L29 9Z" fill="white" fillOpacity="0.95" />
    </svg>
  )
}

const TRUST_ITEMS = [
  { icon: '🎯', text: 'AI matches jobs to your schedule' },
  { icon: '📍', text: 'NY & NJ only — always nearby' },
  { icon: '🔒', text: 'Your data is never sold' },
]

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStatus('loading')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      setError(authError.message)
      setStatus('idle')
      return
    }

    router.push('/onboarding')
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: 'var(--et-surface)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-block mb-5">
            <LogoMark />
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--et-ink)' }}>
            Find your first job.
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--et-muted)', marginTop: '4px' }}>
            Free for NY/NJ teens 14–19. Takes 2 minutes.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {status === 'loading' ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-5 py-16"
            >
              <div className="relative w-14 h-14">
                <svg className="absolute inset-0 animate-spin" width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="var(--et-ground)" strokeWidth="4" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke="var(--et-blue)" strokeWidth="4" strokeLinecap="round" strokeDasharray="138" strokeDashoffset="104" />
                </svg>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--et-muted)' }} className="loading-text">
                Setting up your account…
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSignup}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--et-subtle)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  className="input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--et-subtle)' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                  className="input"
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl"
                    style={{ background: 'var(--et-red-light)' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="var(--et-red)" strokeWidth="1.5" />
                      <path d="M8 5V8.5" stroke="var(--et-red)" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="8" cy="11" r="0.75" fill="var(--et-red)" />
                    </svg>
                    <p style={{ fontSize: '13px', color: 'var(--et-red)', fontWeight: 500 }}>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                className="btn-primary w-full"
                style={{ height: '52px', borderRadius: 'var(--radius-lg)', fontSize: '15px', marginTop: '4px' }}
              >
                Create free account →
              </motion.button>

              {/* Trust signals */}
              <div className="flex flex-col gap-2 pt-2">
                {TRUST_ITEMS.map((item) => (
                  <div key={item.text} className="flex items-center gap-2.5">
                    <span style={{ fontSize: '14px' }}>{item.icon}</span>
                    <span style={{ fontSize: '12px', color: 'var(--et-muted)' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--et-muted)', marginTop: '28px' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--et-blue)', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </motion.div>
    </main>
  )
}
