'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'

const AGES = [14, 15, 16, 17, 18, 19]

export function Step02Age() {
  const { age, setAge, nextStep } = useOnboardingStore()
  const [selected, setSelected] = useState<number | null>(age)

  function handleSelect(a: number) {
    setSelected(a)
    setAge(a)
    setTimeout(nextStep, 280)
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="section-label" style={{ color: 'var(--et-blue)' }}>Step 2 of 11</p>
        <h2 className="text-h1" style={{ color: 'var(--et-ink)' }}>How old are you?</h2>
        <p style={{ fontSize: '14px', color: 'var(--et-muted)' }}>Age determines which jobs you legally qualify for.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {AGES.map((a, i) => {
          const on = selected === a
          return (
            <motion.button
              key={a}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.93 }}
              onClick={() => handleSelect(a)}
              style={{
                height: 72, borderRadius: 'var(--radius-lg)',
                border: on ? '2px solid var(--et-blue)' : '1.5px solid var(--et-border-mid)',
                background: on ? 'var(--et-blue)' : 'var(--et-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s ease',
                boxShadow: on ? 'var(--shadow-blue-sm)' : 'none',
              }}
            >
              <span style={{
                fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em',
                color: on ? '#fff' : 'var(--et-ink)',
              }}>
                {a}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
