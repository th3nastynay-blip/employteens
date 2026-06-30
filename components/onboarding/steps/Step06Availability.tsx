'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import type { WeeklyAvailability, WeekDay } from '@/lib/types/onboarding'

const DAYS: { key: WeekDay; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
]

export function Step06Availability() {
  const { availability, setAvailability, nextStep } = useOnboardingStore()
  const [selected, setSelected] = useState<WeeklyAvailability>(availability)

  function toggle(day: WeekDay) {
    setSelected((prev) => ({ ...prev, [day]: !prev[day] }))
  }

  function handleContinue() {
    setAvailability(selected)
    nextStep()
  }

  const anySelected = Object.values(selected).some(Boolean)

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-[#6B7280] text-sm font-medium uppercase tracking-wider">Step 6 of 12</p>
        <h2 className="text-3xl font-bold text-[#111111] leading-tight">
          When are you available?
        </h2>
        <p className="text-[#6B7280] text-sm">Pick all days you could potentially work.</p>
      </div>

      <div className="flex flex-col gap-3">
        {DAYS.map(({ key, label, short }, i) => (
          <motion.button
            key={key}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => toggle(key)}
            className={`h-14 rounded-2xl px-5 flex items-center justify-between transition-all ${
              selected[key]
                ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-100'
                : 'bg-white text-[#374151] border border-gray-100'
            }`}
          >
            <span className="font-semibold">{label}</span>
            {selected[key] && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
              >
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleContinue}
        disabled={!anySelected}
        className="w-full h-14 bg-[#3B82F6] text-white rounded-2xl font-semibold text-base shadow-lg shadow-blue-200 disabled:opacity-40 disabled:shadow-none transition-all"
      >
        Continue
      </motion.button>
    </div>
  )
}
