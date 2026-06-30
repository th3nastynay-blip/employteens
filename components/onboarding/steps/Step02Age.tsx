'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'

const AGES = [14, 15, 16, 17, 18, 19]

export function Step02Age() {
  const { age, setAge, name, nextStep } = useOnboardingStore()
  const [selected, setSelected] = useState<number | null>(age)

  function handleSelect(a: number) {
    setSelected(a)
    setAge(a)
    setTimeout(nextStep, 300)
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-[#6B7280] text-sm font-medium uppercase tracking-wider">Step 2 of 12</p>
        <h2 className="text-3xl font-bold text-[#111111] leading-tight">
          How old are you{name ? `, ${name}` : ''}?
        </h2>
        <p className="text-[#6B7280] text-sm">Age determines which jobs you&apos;re legally eligible for.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {AGES.map((a, i) => (
          <motion.button
            key={a}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(a)}
            className={`h-16 rounded-2xl text-xl font-bold transition-all ${
              selected === a
                ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-200'
                : 'bg-white text-[#111111] border border-gray-100 hover:border-blue-200'
            }`}
          >
            {a}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
