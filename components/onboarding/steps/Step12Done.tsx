'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/lib/store/onboarding-store'

const ease = [0.22, 1, 0.36, 1] as const

export function Step12Done() {
  const name = useOnboardingStore((s) => s.name)
  const reset = useOnboardingStore((s) => s.reset)
  const router = useRouter()

  function handleGoToDashboard() {
    reset()
    router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-sm flex flex-col items-center text-center gap-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{ fontSize: '64px' }}
      >
        🎉
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, ease }}
        className="flex flex-col gap-3"
      >
        <h2 className="text-h1" style={{ color: 'var(--et-ink)' }}>
          Your profile is live, {name}!
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--et-muted)', lineHeight: 1.55 }}>
          Your AI job feed is ready. New matches will appear every day, automatically.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, ease }}
        className="w-full flex flex-col gap-2.5"
      >
        {[
          { emoji: '🎯', text: 'AI matches refreshed daily' },
          { emoji: '📍', text: 'Only jobs near you in NY/NJ' },
          { emoji: '🛡️', text: 'Every job scam-checked' },
        ].map(({ emoji, text }) => (
          <div
            key={text}
            className="flex items-center gap-3 px-4 py-3 card"
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <span style={{ fontSize: '18px' }}>{emoji}</span>
            <span style={{ fontSize: '14px', color: 'var(--et-subtle)', fontWeight: 500 }}>{text}</span>
          </div>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, ease }}
        whileTap={{ scale: 0.97 }}
        onClick={handleGoToDashboard}
        className="btn-primary w-full"
        style={{ height: 52, borderRadius: 'var(--radius-lg)', fontSize: '16px' }}
      >
        See my job matches →
      </motion.button>
    </div>
  )
}
