'use client'

import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'

export function Step00Welcome() {
  const nextStep = useOnboardingStore((s) => s.nextStep)

  return (
    <div className="w-full max-w-sm flex flex-col items-center text-center gap-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
        className="w-20 h-20 rounded-3xl bg-[#3B82F6] flex items-center justify-center shadow-xl shadow-blue-200"
      >
        <span className="text-white text-3xl font-bold">ET</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3"
      >
        <h1 className="text-3xl font-bold text-[#111111] leading-tight">
          Find your first job.<br />
          <span className="text-[#3B82F6]">We'll do the work.</span>
        </h1>
        <p className="text-[#6B7280] text-base leading-relaxed">
          EmployTeens matches you with real jobs near you — automatically, every day.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="w-full flex flex-col gap-2"
      >
        {['Takes about 2 minutes', 'No experience required', 'Built for teens 14–19 in NY/NJ'].map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-[#374151]">
            <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {item}
          </div>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        whileTap={{ scale: 0.97 }}
        onClick={nextStep}
        className="w-full h-14 bg-[#3B82F6] text-white rounded-2xl font-semibold text-base shadow-lg shadow-blue-200"
      >
        Let&apos;s go →
      </motion.button>
    </div>
  )
}
