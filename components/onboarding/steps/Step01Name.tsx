'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
        <p className="section-label" style={{ color: 'var(--et-blue)' }}>Step 1 of 11</p>
        <h2 className="text-h1" style={{ color: 'var(--et-ink)' }}>What&apos;s your first name?</h2>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
        placeholder="Your name"
        autoFocus
        className="input"
        style={{ height: 60, fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}
      />

      <AnimatePresence>
        {value.trim() && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ fontSize: '15px', color: 'var(--et-muted)' }}
          >
            Hey {value.trim()}! Let&apos;s find you a job. 👋
          </motion.p>
        )}
      </AnimatePresence>

      <button
        onClick={handleContinue}
        disabled={!value.trim()}
        className="btn-primary w-full"
        style={{ height: 52, borderRadius: 'var(--radius-lg)', fontSize: '15px', opacity: value.trim() ? 1 : 0.4 }}
      >
        Continue
      </button>
    </div>
  )
}
