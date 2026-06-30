'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'

export function Step01Name() {
  const { name, setName, nextStep } = useOnboardingStore()
  const [value, setValue] = useState(name)

  function handleContinue() {
    if (!value.trim()) return
    setName(value.trim())
    nextStep()
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-[#6B7280] text-sm font-medium uppercase tracking-wider">Step 1 of 12</p>
        <h2 className="text-3xl font-bold text-[#111111] leading-tight">
          What&apos;s your first name?
        </h2>
      </div>

      <motion.input
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
        placeholder="Your name"
        autoFocus
        className="h-16 bg-white border-2 border-gray-100 rounded-2xl px-5 text-2xl font-semibold text-[#111111] placeholder-gray-300 focus:outline-none focus:border-[#3B82F6] transition-colors"
      />

      {value.trim() && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[#6B7280] text-base"
        >
          Hey {value.trim()}! Let&apos;s find you a job. 👋
        </motion.p>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleContinue}
        disabled={!value.trim()}
        className="w-full h-14 bg-[#3B82F6] text-white rounded-2xl font-semibold text-base shadow-lg shadow-blue-200 disabled:opacity-40 disabled:shadow-none transition-all"
      >
        Continue
      </motion.button>
    </div>
  )
}
