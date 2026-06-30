'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'

export function Step03Location() {
  const { state, zip_code, setState, setZipCode, nextStep } = useOnboardingStore()
  const [selectedState, setSelectedState] = useState<'NY' | 'NJ' | ''>(state)
  const [zip, setZip] = useState(zip_code)

  function handleContinue() {
    if (!selectedState || zip.length !== 5) return
    setState(selectedState as 'NY' | 'NJ')
    setZipCode(zip)
    nextStep()
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-[#6B7280] text-sm font-medium uppercase tracking-wider">Step 3 of 12</p>
        <h2 className="text-3xl font-bold text-[#111111] leading-tight">
          Where are you located?
        </h2>
        <p className="text-[#6B7280] text-sm">We only show jobs near you in NY or NJ.</p>
      </div>

      {/* State selector */}
      <div className="grid grid-cols-2 gap-3">
        {(['NY', 'NJ'] as const).map((s) => (
          <motion.button
            key={s}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedState(s)}
            className={`h-16 rounded-2xl text-xl font-bold transition-all ${
              selectedState === s
                ? 'bg-[#3B82F6] text-white shadow-lg shadow-blue-200'
                : 'bg-white text-[#111111] border border-gray-100 hover:border-blue-200'
            }`}
          >
            {s === 'NY' ? '🗽 New York' : '🌿 New Jersey'}
          </motion.button>
        ))}
      </div>

      {/* ZIP input */}
      {selectedState && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2"
        >
          <label className="text-sm font-medium text-[#374151]">ZIP Code</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 10001"
            className="h-14 bg-white border-2 border-gray-100 rounded-2xl px-5 text-xl font-semibold text-[#111111] placeholder-gray-300 focus:outline-none focus:border-[#3B82F6] transition-colors tracking-widest"
          />
        </motion.div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleContinue}
        disabled={!selectedState || zip.length !== 5}
        className="w-full h-14 bg-[#3B82F6] text-white rounded-2xl font-semibold text-base shadow-lg shadow-blue-200 disabled:opacity-40 disabled:shadow-none transition-all"
      >
        Continue
      </motion.button>
    </div>
  )
}
