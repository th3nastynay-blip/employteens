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
        <linearGradient id="authLg" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="52" height="52" rx="16" fill="url(#authLg)" />
      <path d="M29 9L17 28H25L23 43L35 24H27L29 9Z" fill="white" fillOpacity="0.95" />
    </svg>
  )
}

const AI_MESSAGES = [
  'Loading your matches…',
  'Connecting to your feed…',
  'Almost there…',
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [aiIdx, setAiIdx] = useState(0)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStatus('loading')

    // cycle AI messages
    const interval = setInterval(() => setAiIdx((i) => Math.min(i + 1, AI_MESSAGES.length - 1)), 900)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    clearInterval(interval)

    if (authError) {
      setError(authError.message)
      setStatus('idle')
      setAiIdx(0)
      return
    }

    setStatus('done')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6"
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
            Welcome back
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--et-muted)', marginTop: '4px' }}>
            Your matches are waiting.
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
              {/* Spinner with gradient ring */}
              <div className="relative w-14 h-14">
                <svg className="absolute inset-0 animate-spin" width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="var(--et-ground)" strokeWidth="4" />
                  <circle
                    cx="28" cy="28" r="22"
                    fill="none"
                    stroke="var(--et-blue)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="138"
                    strokeDashoffset="104"
                  />
                </svg>
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={aiIdx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  style={{ fontSize: '14px', color: 'var(--et-muted)' }}
                >
                  {AI_MESSAGES[aiIdx]}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleLogin}
              className="flex flex-col gap-4"
            >
              {/* Email */}
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

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--et-subtle)' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input"
                />
              </div>

              {/* Error */}
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

              {/* Submit */}
              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                className="btn-primary w-full"
                style={{ height: '52px', borderRadius: 'var(--radius-lg)', fontSize: '15px', marginTop: '4px' }}
              >
                Sign In
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Footer link */}
        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--et-muted)', marginTop: '28px' }}>
          No account?{' '}
          <Link href="/signup" style={{ color: 'var(--et-blue)', fontWeight: 600 }}>
            Create one free
          </Link>
        </p>
      </motion.div>
    </main>
  )
}
