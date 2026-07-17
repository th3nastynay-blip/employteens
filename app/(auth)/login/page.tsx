'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ease = [0.22, 1, 0.36, 1] as const

// Map auth callback error codes to readable messages
const CALLBACK_ERRORS: Record<string, string> = {
  auth_callback_failed: 'Your sign-in link expired or was already used. Please try again.',
  missing_code: 'Something went wrong with the sign-in link. Please try again.',
}

function LogoMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 52 52" fill="none">
      <defs>
        <linearGradient id="lgLg" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" /><stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="52" height="52" rx="16" fill="url(#lgLg)" />
      <path d="M29 9L17 28H25L23 43L35 24H27L29 9Z" fill="white" fillOpacity="0.95" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
      <path d="M13.28 9.53c-.02-2.03 1.66-3.01 1.74-3.06-0.95-1.39-2.42-1.58-2.94-1.60-1.25-.13-2.45.74-3.08.74-.63 0-1.60-.72-2.63-.70-1.35.02-2.6.79-3.29 2.00-1.41 2.44-.36 6.06 1.01 8.05.67.97 1.46 2.06 2.51 2.02 1.01-.04 1.39-.65 2.61-.65 1.22 0 1.56.65 2.63.63 1.08-.02 1.77-1.00 2.43-1.97.77-1.13 1.08-2.23 1.10-2.29-.03-.01-2.09-.80-2.11-3.17z" fill="currentColor"/>
      <path d="M11.28 3.28c.56-.68.93-1.62.83-2.56-.80.03-1.77.53-2.34 1.20-.52.59-.97 1.54-.85 2.45.90.07 1.81-.46 2.36-1.09z" fill="currentColor"/>
    </svg>
  )
}

function OAuthButton({
  label, icon, onClick, loading,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  loading: boolean
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={loading}
      type="button"
      style={{
        width: '100%', height: 50,
        borderRadius: 'var(--radius-md)',
        border: '1.5px solid var(--et-border-mid)',
        background: 'var(--et-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '14px', fontWeight: 600,
        color: 'var(--et-ink)', transition: 'all 0.15s ease',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </motion.button>
  )
}

function ErrorBanner({ message }: { message: string }) {
  const friendly = message.toLowerCase().includes('invalid login credentials')
    ? 'Wrong email or password. Double-check and try again.'
    : message.toLowerCase().includes('email not confirmed')
    ? 'Please confirm your email first — check your inbox.'
    : message

  return (
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
      <p style={{ fontSize: '13px', color: 'var(--et-red)', fontWeight: 500, lineHeight: 1.4 }}>{friendly}</p>
    </motion.div>
  )
}

type Status = 'idle' | 'loading-oauth' | 'loading-email'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [oauthProvider, setOauthProvider] = useState<'google' | 'apple' | null>(null)

  // Surface errors from auth callback redirects (e.g. expired link)
  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(CALLBACK_ERRORS[urlError] ?? 'Something went wrong. Please try again.')
    }
  }, [searchParams])

  const isLoading = status === 'loading-oauth' || status === 'loading-email'

  async function handleOAuth(provider: 'google' | 'apple') {
    setError('')
    setStatus('loading-oauth')
    setOauthProvider(provider)

    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })

    if (oauthError) {
      setError(oauthError.message)
      setStatus('idle')
      setOauthProvider(null)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStatus('loading-email')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setStatus('idle')
      return
    }

    router.refresh()
    router.push('/dashboard')
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
            Welcome back
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--et-muted)', marginTop: 4 }}>
            Your matches are waiting.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-14"
            >
              <div className="relative" style={{ width: 52, height: 52 }}>
                <svg className="animate-spin" width="52" height="52" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="20" fill="none" stroke="var(--et-ground)" strokeWidth="4"/>
                  <circle cx="26" cy="26" r="20" fill="none" stroke="var(--et-blue)" strokeWidth="4" strokeLinecap="round" strokeDasharray="125" strokeDashoffset="94"/>
                </svg>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--et-muted)' }}>
                {oauthProvider === 'google' ? 'Connecting to Google…' :
                 oauthProvider === 'apple'  ? 'Connecting to Apple…' :
                 'Signing you in…'}
              </p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">

              {/* OAuth hidden for App Store v1 (Guideline 4.8: any third-party
                  login requires Sign in with Apple, which needs the enrolled
                  developer account). Verified 2026-07-13: only 1 google-auth
                  user (founder test account). Re-enable Google + Apple
                  TOGETHER post-launch. */}
              {OAUTH_ENABLED && (
                <>
                  <div className="flex flex-col gap-2.5">
                    <OAuthButton
                      label="Continue with Google"
                      icon={<GoogleIcon />}
                      onClick={() => handleOAuth('google')}
                      loading={isLoading}
                    />
                    <OAuthButton
                      label="Continue with Apple"
                      icon={<AppleIcon />}
                      onClick={() => handleOAuth('apple')}
                      loading={isLoading}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div style={{ flex: 1, height: 1, background: 'var(--et-border)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--et-placeholder)', fontWeight: 500 }}>or continue with email</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--et-border)' }} />
                  </div>
                </>
              )}

              <form onSubmit={handleLogin} className="flex flex-col gap-3">
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

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--et-subtle)' }}>Password</label>
                    <Link
                      href="/forgot-password"
                      style={{ fontSize: '12px', color: 'var(--et-blue)', fontWeight: 500 }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="input"
                  />
                </div>

                <AnimatePresence>
                  {error && <ErrorBanner message={error} />}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary w-full"
                  style={{ height: 50, borderRadius: 'var(--radius-lg)', fontSize: '15px' }}
                >
                  Sign in →
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--et-muted)', marginTop: 24 }}>
          No account?{' '}
          <Link href="/signup" style={{ color: 'var(--et-blue)', fontWeight: 600 }}>Create one free</Link>
        </p>
      </motion.div>
    </main>
  )
}

// useSearchParams requires Suspense boundary
// Flip to true only when Sign in with Apple is configured alongside Google (Guideline 4.8)
const OAUTH_ENABLED = false

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
