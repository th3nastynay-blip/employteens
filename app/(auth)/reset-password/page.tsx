'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ease = [0.22, 1, 0.36, 1] as const

function LogoMark() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" width={40} height={40} alt="EmployTeens" style={{ borderRadius: 11, display: 'block' }} />
}

type Status = 'idle' | 'loading' | 'done' | 'invalid'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  // Supabase sends the session via URL hash after the user clicks the reset link.
  // The onAuthStateChange PASSWORD_RECOVERY event fires once the hash is processed.
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is now in a temporary "password recovery" session — safe to update.
        setStatus('idle')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setStatus('loading')
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setStatus('idle')
      return
    }

    setStatus('done')
    // After password reset, kick back to dashboard (user is already signed in)
    setTimeout(() => {
      router.refresh()
      router.push('/dashboard')
    }, 1800)
  }

  if (status === 'done') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'var(--et-surface)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease }}
          className="w-full max-w-sm flex flex-col items-center text-center gap-6"
        >
          <div style={{
            width: 72, height: 72, borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(34,197,94,0.2)',
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="13" stroke="#16A34A" strokeWidth="2"/>
              <path d="M10 16L14 20L22 12" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--et-ink)' }}>
              Password updated
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--et-muted)', marginTop: 6 }}>
              Taking you to your dashboard…
            </p>
          </div>
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
          <Link href="/" className="inline-block mb-5"><LogoMark /></Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--et-ink)' }}>
            Choose a new password
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--et-muted)', marginTop: 4 }}>
            At least 8 characters. Make it a good one.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--et-subtle)' }}>New password</label>
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

          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--et-subtle)' }}>Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Same as above"
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
            {status === 'loading' ? 'Updating…' : 'Update password →'}
          </motion.button>
        </form>
      </motion.div>
    </main>
  )
}
