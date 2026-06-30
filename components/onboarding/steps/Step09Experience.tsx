'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import { EXPERIENCE_LABELS, type ExperienceLevel } from '@/lib/types/onboarding'

const OPTIONS: { value: ExperienceLevel; emoji: string; sub: string }[] = [
  { value: 'none', emoji: '🌱', sub: 'Totally fine — most teens start here' },
  { value: 'some_volunteering', emoji: '🤝', sub: 'Community service, church, etc.' },
  { value: 'one_job', emoji: '💼', sub: 'You know the basics' },
  { value: 'multiple_jobs', emoji: '⭐', sub: 'You\'re a pro' },
]

export function Step09Experience() {
  const { experience, setExperience, nextStep } = useOnboardingStore()
  const [selected, setSelected] = useState<ExperienceLevel | ''>(experience)

  function handleSelect(e: ExperienceLevel) {
    setSelected(e)
    setExperience(e)
    setTimeout(nextStep, 300)
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-[#6B7280] text-sm font-medium uppercase tracking-wider">Step 9 of 12</p>
        <h2 className="text-3xl font-bold text-[#111111] leading-tight">
          Any work experience?
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {OPTIONS.map(({ value, emoji, sub }, i) => (
          <motion.button
            key={value}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect(value)}
            className={`rounded-2xl px-5 py-4 flex items-center gap-4 text-left transition-all ${
              selected === value
                ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-200'
                : 'bg-white text-[#111111] border border-gray-100 hover:border-blue-200'
            }`}
          >
            <span className="text-2xl">{emoji}</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-sm">{EXPERIENCE_LABELS[value]}</span>
              <span className={`text-xs ${selected === value ? 'text-blue-100' : 'text-[#9CA3AF]'}`}>{sub}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
