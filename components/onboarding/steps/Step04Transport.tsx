'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import { TRANSPORTATION_LABELS, type Transportation } from '@/lib/types/onboarding'

const OPTIONS: { value: Transportation; emoji: string }[] = [
  { value: 'walking', emoji: '🚶' },
  { value: 'public_transit', emoji: '🚌' },
  { value: 'bike', emoji: '🚲' },
  { value: 'car', emoji: '🚗' },
  { value: 'parent_dropoff', emoji: '👨‍👧' },
]

export function Step04Transport() {
  const { transportation, setTransportation, nextStep } = useOnboardingStore()
  const [selected, setSelected] = useState<Transportation | ''>(transportation)

  function handleSelect(t: Transportation) {
    setSelected(t)
    setTransportation(t)
    setTimeout(nextStep, 300)
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-[#6B7280] text-sm font-medium uppercase tracking-wider">Step 4 of 12</p>
        <h2 className="text-3xl font-bold text-[#111111] leading-tight">
          How do you get around?
        </h2>
        <p className="text-[#6B7280] text-sm">We&apos;ll only show jobs you can realistically reach.</p>
      </div>

      <div className="flex flex-col gap-3">
        {OPTIONS.map(({ value, emoji }, i) => (
          <motion.button
            key={value}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect(value)}
            className={`h-16 rounded-2xl px-5 flex items-center gap-4 transition-all ${
              selected === value
                ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-200'
                : 'bg-white text-[#111111] border border-gray-100 hover:border-blue-200'
            }`}
          >
            <span className="text-2xl">{emoji}</span>
            <span className="font-semibold text-base">{TRANSPORTATION_LABELS[value]}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
