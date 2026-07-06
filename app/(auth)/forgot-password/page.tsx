'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ease = [0.22, 1, 0.36, 1] as const

function LogoMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 52 52" fill="none">
      <defs>
        <linearGradient id="fpLg" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" /><stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="52" height="52" rx="16" fill="url(#fpLg)" />
      <path d="M29 9L17 28H25L23 43L35 24H27L29 9Z" fill="white" fillOpacity="0.95" />
    </svg>
  )
}

type Status = 'idle' | 'loading' | 'sent'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStatus('loading')

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    if (resetError) {
      setError(resetError.message)
      setStatus('idle')
      return
    }

    // Always show success — never confirm whether email exists (security)
    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--et-surface)' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          className="w-full max-w-sm flex flex-col items-center text-center gap-7"
        >
          <LogoMark />

          <div style={{
            width: 72, height: 72, borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(37,99,235,0.12)',
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="lockG" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2563EB"/><stop offset="1" stopColor="#7C3AED"/>
                </linearGradient>
              </defs>
              <rect x="6" y="14" width="20" height="14" rx="3" stroke="url(#lockG)" strokeWidth="1.75"/>
              <path d="M10 14v-4a6 6 0 0112 0v4" stroke="url(#lockG)" strokeWidth="1.75" strokeLinecap="round"/>
              <circle cx="16" cy="21" r="2" fill="url(#lockG)"/>
            </svg>
          </div>

          <div className="flex flex-col gap-2">
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--et-ink)' }}>
              Check your inbox
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--et-muted)', lineHeight: 1.6 }}>
              If <strong style={{ color: 'var(--et-ink)' }}>{email}</strong> is registered, you&apos;ll
              get a reset link shortly. Check spam too.
            </p>
          </div>

          <div className="w-full flex flex-col gap-2.5">
            {[
              'Open the email from EmployTeens',
              'Click "Reset your password"',
              'Choose a new password and sign in',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--et-blue-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--et-blue)' }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--et-subtle)', textAlign: 'left' }}>{text}</span>
              </div>
            ))}
          </div>

          <Link href="/login">
            <button
              className="btn-secondary w-full"
              style={{ borderRadius: 'var(--radius-lg)', fontSize: '14px', height: 46 }}
            >
              Back to sign in
            </button>
          </Link>
        </motion.div>
      </main>
    )
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
        <div className="mb-7">
          <Link href="/login" className="inline-block mb-5"><LogoMark /></Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--et-ink)' }}>
            Reset your password
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--et-muted)', marginTop: 4 }}>
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--et-subtle)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
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
                style={{ background: 'var(--et-red-light)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}
                className="flex items-start gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="8" cy="8" r="7" stroke="var(--et-red)" strokeWidth="1.5" />
                  <path d="M8 5V8.5" stroke="var(--et-red)" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="11" r="0.75" fill="var(--et-red)" />
                </svg>
                <p style={{ fontSize: '13px', color: 'var(--et-red)', fontWeight: 500, lineHeight: 1.4 }}>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={status === 'loading'}
            whileTap={{ scale: 0.97 }}
            className="btn-primary w-full"
            style={{ height: 50, borderRadius: 'var(--radius-lg)', fontSize: '15px', opacity: status === 'loading' ? 0.7 : 1 }}
          >
            {status === 'loading' ? 'Sending…' : 'Send reset link →'}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--et-muted)', marginTop: 24 }}>
          Remember it?{' '}
          <Link href="/login" style={{ color: 'var(--et-blue)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </motion.div>
    </main>
  )
}
