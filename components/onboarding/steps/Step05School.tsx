'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import { GRADE_LABELS, type SchoolGrade } from '@/lib/types/onboarding'

const GRADES = Object.entries(GRADE_LABELS) as [SchoolGrade, string][]

const END_TIMES = ['1:00 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM']

export function Step05School() {
  const { school_grade, school_end_time, setSchoolGrade, setSchoolEndTime, nextStep } = useOnboardingStore()
  const [grade, setGrade] = useState<SchoolGrade | ''>(school_grade)
  const [endTime, setEndTime] = useState(school_end_time)

  function handleContinue() {
    if (!grade) return
    setSchoolGrade(grade)
    setSchoolEndTime(endTime)
    nextStep()
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="section-label" style={{ color: 'var(--et-blue)' }}>Step 5 of 11</p>
        <h2 className="text-h1" style={{ color: 'var(--et-ink)' }}>School schedule</h2>
        <p style={{ fontSize: '14px', color: 'var(--et-muted)' }}>We&apos;ll only show jobs compatible with your school hours.</p>
      </div>

      {/* Grade */}
      <div className="flex flex-col gap-3">
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--et-subtle)' }}>What grade are you in?</p>
        <div className="flex flex-wrap gap-2">
          {GRADES.map(([value, label], i) => {
            const on = grade === value
            return (
              <motion.button
                key={value}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setGrade(value)}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-full)',
                  border: on ? '1.5px solid rgba(37,99,235,0.3)' : '1.5px solid var(--et-border-mid)',
                  background: on ? 'var(--et-blue)' : 'var(--et-surface)',
                  fontSize: '13px', fontWeight: 600,
                  color: on ? '#fff' : 'var(--et-subtle)',
                  cursor: 'pointer', transition: 'all 0.12s ease',
                }}
              >
                {label}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* School end time */}
      <div className="flex flex-col gap-3">
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--et-subtle)' }}>
          What time does school end?
        </p>
        <div className="flex flex-wrap gap-2">
          {END_TIMES.map((t) => {
            const on = endTime === t
            return (
              <motion.button
                key={t}
                whileTap={{ scale: 0.94 }}
                onClick={() => setEndTime(t)}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--radius-full)',
                  border: on ? '1.5px solid rgba(37,99,235,0.3)' : '1.5px solid var(--et-border-mid)',
                  background: on ? 'var(--et-blue-light)' : 'var(--et-surface)',
                  fontSize: '13px', fontWeight: 600,
                  color: on ? 'var(--et-blue)' : 'var(--et-subtle)',
                  cursor: 'pointer', transition: 'all 0.12s ease',
                }}
              >
                {t}
              </motion.button>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={!grade}
        className="btn-primary w-full"
        style={{ height: 52, borderRadius: 'var(--radius-lg)', fontSize: '15px', opacity: grade ? 1 : 0.4 }}
      >
        Continue
      </button>
    </div>
  )
}
