'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import { EXPERIENCE_LABELS, type ExperienceLevel } from '@/lib/types/onboarding'

const OPTIONS: { value: ExperienceLevel; emoji: string; sub: string }[] = [
  { value: 'none',              emoji: '🌱', sub: 'Totally fine — most teens start here' },
  { value: 'some_volunteering', emoji: '🤝', sub: 'Community service, clubs, etc.' },
  { value: 'one_job',           emoji: '💼', sub: 'You know the basics' },
  { value: 'multiple_jobs',     emoji: '⭐', sub: "You're experienced" },
]

export function Step09Experience() {
  const { experience, setExperience, nextStep } = useOnboardingStore()
  const [selected, setSelected] = useState<ExperienceLevel | ''>(experience)

  function handleSelect(e: ExperienceLevel) {
    setSelected(e)
    setExperience(e)
    setTimeout(nextStep, 280)
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="section-label" style={{ color: 'var(--et-blue)' }}>Step 9 of 11</p>
        <h2 className="text-h1" style={{ color: 'var(--et-ink)' }}>Any work experience?</h2>
      </div>

      <div className="flex flex-col gap-2.5">
        {OPTIONS.map(({ value, emoji, sub }, i) => {
          const on = selected === value
          return (
            <motion.button
              key={value}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(value)}
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 'var(--radius-lg)',
                border: on ? '1.5px solid rgba(37,99,235,0.3)' : '1.5px solid var(--et-border-mid)',
                background: on ? 'var(--et-blue-light)' : 'var(--et-surface)',
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '24px', flexShrink: 0 }}>{emoji}</span>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: on ? 'var(--et-blue)' : 'var(--et-ink)' }}>
                  {EXPERIENCE_LABELS[value]}
                </p>
                <p style={{ fontSize: '12px', color: on ? 'var(--et-blue-mid)' : 'var(--et-placeholder)', marginTop: 1 }}>
                  {sub}
                </p>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
