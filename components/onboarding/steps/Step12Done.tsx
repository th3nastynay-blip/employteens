'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useOnboardingStore } from '@/lib/store/onboarding-store'

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
      {/* Celebration */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="text-7xl"
      >
        🎉
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-3"
      >
        <h2 className="text-3xl font-bold text-[#111111]">
          Your match profile is live, {name}!
        </h2>
        <p className="text-[#6B7280] text-base leading-relaxed">
          We&apos;ve built your job feed. New matches will appear daily, automatically.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full flex flex-col gap-3"
      >
        {[
          { icon: '🎯', text: 'AI matches refreshed daily' },
          { icon: '📍', text: 'Only jobs near you in NY/NJ' },
          { icon: '🛡️', text: 'Every job scam-checked' },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-gray-100">
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm text-[#374151] font-medium">{item.text}</span>
          </div>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleGoToDashboard}
        className="w-full h-14 bg-[#3B82F6] text-white rounded-2xl font-semibold text-base shadow-lg shadow-blue-200"
      >
        See my job matches →
      </motion.button>
    </div>
  )
}
