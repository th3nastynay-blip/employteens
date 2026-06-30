'use client'

import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import { SKILL_OPTIONS } from '@/lib/types/onboarding'

export function Step08Skills() {
  const { skills, toggleSkill, nextStep } = useOnboardingStore()

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-[#6B7280] text-sm font-medium uppercase tracking-wider">Step 8 of 12</p>
        <h2 className="text-3xl font-bold text-[#111111] leading-tight">
          What skills do you have?
        </h2>
        <p className="text-[#6B7280] text-sm">Be honest — no experience is totally fine.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SKILL_OPTIONS.map((skill, i) => (
          <motion.button
            key={skill}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => toggleSkill(skill)}
            className={`h-10 px-4 rounded-full text-sm font-medium transition-all ${
              skills.includes(skill)
                ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-100'
                : 'bg-white text-[#374151] border border-gray-200'
            }`}
          >
            {skill}
          </motion.button>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={nextStep}
        className="w-full h-14 bg-[#3B82F6] text-white rounded-2xl font-semibold text-base shadow-lg shadow-blue-200 transition-all"
      >
        {skills.length > 0 ? `Continue (${skills.length} selected)` : 'Skip for now'}
      </motion.button>
    </div>
  )
}
