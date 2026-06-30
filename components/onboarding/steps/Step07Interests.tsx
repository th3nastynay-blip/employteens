'use client'

import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import { INTEREST_OPTIONS } from '@/lib/types/onboarding'

export function Step07Interests() {
  const { interests, toggleInterest, nextStep } = useOnboardingStore()

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-[#6B7280] text-sm font-medium uppercase tracking-wider">Step 7 of 12</p>
        <h2 className="text-3xl font-bold text-[#111111] leading-tight">
          What are you into?
        </h2>
        <p className="text-[#6B7280] text-sm">Pick everything that sounds like you (or could be fun).</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {INTEREST_OPTIONS.map((interest, i) => (
          <motion.button
            key={interest}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => toggleInterest(interest)}
            className={`h-10 px-4 rounded-full text-sm font-medium transition-all ${
              interests.includes(interest)
                ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-100'
                : 'bg-white text-[#374151] border border-gray-200'
            }`}
          >
            {interest}
          </motion.button>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={nextStep}
        disabled={interests.length === 0}
        className="w-full h-14 bg-[#3B82F6] text-white rounded-2xl font-semibold text-base shadow-lg shadow-blue-200 disabled:opacity-40 disabled:shadow-none transition-all"
      >
        {interests.length > 0 ? `Continue (${interests.length} selected)` : 'Pick at least one'}
      </motion.button>
    </div>
  )
}
