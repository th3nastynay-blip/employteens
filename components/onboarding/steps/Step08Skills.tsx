'use client'

import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import { SKILL_OPTIONS } from '@/lib/types/onboarding'

export function Step08Skills() {
  const { skills, toggleSkill, nextStep } = useOnboardingStore()

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="section-label" style={{ color: 'var(--et-blue)' }}>Step 8 of 11</p>
        <h2 className="text-h1" style={{ color: 'var(--et-ink)' }}>What skills do you have?</h2>
        <p style={{ fontSize: '14px', color: 'var(--et-muted)' }}>Be honest — no experience is totally fine.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SKILL_OPTIONS.map((skill, i) => {
          const selected = skills.includes(skill)
          return (
            <motion.button
              key={skill}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.93 }}
              onClick={() => toggleSkill(skill)}
              className={selected ? 'chip chip-selected' : 'chip'}
            >
              {selected && <span style={{ marginRight: 3 }}>✓</span>}
              {skill}
            </motion.button>
          )
        })}
      </div>

      <button
        onClick={nextStep}
        className="btn-primary w-full"
        style={{ height: 52, borderRadius: 'var(--radius-lg)', fontSize: '15px' }}
      >
        {skills.length > 0 ? `Continue (${skills.length} selected)` : 'Skip for now'}
      </button>
    </div>
  )
}
