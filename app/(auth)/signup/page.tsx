'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setStatus('idle')
      return
    }

    // Redirect to onboarding to collect profile data
    router.push('/onboarding')
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <div className="w-12 h-12 rounded-2xl bg-[#3B82F6] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
              <span className="text-white text-lg font-bold">ET</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-[#111111]">Create your account</h1>
          <p className="text-[#6B7280] text-sm mt-1">Free for NY/NJ teens 14–19</p>
        </div>

        {status === 'loading' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 py-12"
          >
            <div className="w-12 h-12 rounded-full border-2 border-[#3B82F6] border-t-transparent animate-spin" />
            <p className="text-[#6B7280] text-sm loading-text">Creating your account…</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#374151]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
                className="h-14 bg-white border border-gray-200 rounded-2xl px-4 text-[#111111] placeholder-gray-400 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#374151]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
                className="h-14 bg-white border border-gray-200 rounded-2xl px-4 text-[#111111] placeholder-gray-400 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 text-center"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              className="h-14 bg-[#3B82F6] text-white rounded-2xl font-semibold text-base shadow-lg shadow-blue-200 hover:bg-blue-500 transition-colors mt-2"
            >
              Create Account
            </motion.button>

            <p className="text-xs text-[#9CA3AF] text-center">
              By signing up you agree to our Terms of Service
            </p>
          </form>
        )}

        <p className="text-center text-sm text-[#6B7280] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#3B82F6] font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </main>
  )
}
