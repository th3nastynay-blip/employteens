'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import type { WeeklyAvailability, WeekDay } from '@/lib/types/onboarding'

const DAYS: { key: WeekDay; label: string }[] = [
  { key: 'monday',    label: 'Monday' },
  { key: 'tuesday',   label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday',  label: 'Thursday' },
  { key: 'friday',    label: 'Friday' },
  { key: 'saturday',  label: 'Saturday' },
  { key: 'sunday',    label: 'Sunday' },
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

  const count = Object.values(selected).filter(Boolean).length

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="section-label" style={{ color: 'var(--et-blue)' }}>Step 6 of 11</p>
        <h2 className="text-h1" style={{ color: 'var(--et-ink)' }}>When are you available?</h2>
        <p style={{ fontSize: '14px', color: 'var(--et-muted)' }}>Pick all days you could potentially work.</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {DAYS.map(({ key, label }, i) => {
          const on = selected[key]
          return (
            <motion.button
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggle(key)}
              style={{
                height: 52, borderRadius: 'var(--radius-md)', padding: '0 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                border: on ? '1.5px solid rgba(37,99,235,0.3)' : '1.5px solid var(--et-border-mid)',
                background: on ? 'var(--et-blue-light)' : 'var(--et-surface)',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 600, color: on ? 'var(--et-blue)' : 'var(--et-ink)' }}>
                {label}
              </span>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                border: on ? '2px solid var(--et-blue)' : '2px solid var(--et-border-mid)',
                background: on ? 'var(--et-blue)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.12s ease',
              }}>
                {on && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={count === 0}
        className="btn-primary w-full"
        style={{ height: 52, borderRadius: 'var(--radius-lg)', fontSize: '15px', opacity: count > 0 ? 1 : 0.4 }}
      >
        {count > 0 ? `Continue (${count} day${count > 1 ? 's' : ''})` : 'Pick at least one day'}
      </button>
    </div>
  )
}
