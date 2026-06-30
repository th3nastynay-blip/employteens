'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import { INTEREST_OPTIONS } from '@/lib/types/onboarding'

const WEIGHT_LABELS: Record<1 | 2 | 3, { label: string; color: string; bg: string }> = {
  3: { label: 'High', color: 'var(--et-blue)', bg: 'var(--et-blue-light)' },
  2: { label: 'Medium', color: 'var(--et-purple)', bg: 'var(--et-purple-light)' },
  1: { label: 'Low', color: 'var(--et-muted)', bg: 'var(--et-ground)' },
}

export function Step07Interests() {
  const { interests, toggleInterest, setInterestWeight, nextStep } = useOnboardingStore()

  function cycleWeight(name: string) {
    const current = interests.find((i) => i.name === name)
    if (!current) return
    const next = current.weight === 3 ? 2 : current.weight === 2 ? 1 : 3
    setInterestWeight(name, next as 1 | 2 | 3)
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="section-label" style={{ color: 'var(--et-blue)' }}>Step 7 of 12</p>
        <h2 className="text-h1">What are you into?</h2>
        <p style={{ fontSize: '14px', color: 'var(--et-muted)', lineHeight: 1.5 }}>
          Tap to add. Tap the label to change priority. Your first pick gets the highest weight.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {INTEREST_OPTIONS.map((interest, i) => {
          const found = interests.find((x) => x.name === interest)
          const selected = !!found
          const weight = found?.weight ?? 1
          const wStyle = selected ? WEIGHT_LABELS[weight as 1 | 2 | 3] : null

          return (
            <motion.div
              key={interest}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-0 overflow-hidden"
              style={{
                borderRadius: 'var(--radius-full)',
                border: selected ? '1.5px solid rgba(37,99,235,0.25)' : '1.5px solid var(--et-border-mid)',
                background: selected ? wStyle!.bg : 'var(--et-surface)',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Main tap: toggle */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleInterest(interest)}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: selected ? 600 : 500,
                  color: selected ? wStyle!.color : 'var(--et-subtle)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {selected && <span style={{ marginRight: 4 }}>✓</span>}
                {interest}
              </motion.button>

              {/* Weight badge: only shown when selected */}
              <AnimatePresence>
                {selected && (
                  <motion.button
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={(e) => { e.stopPropagation(); cycleWeight(interest) }}
                    style={{
                      padding: '4px 8px 4px 0',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: wStyle!.color,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                    }}
                  >
                    {WEIGHT_LABELS[weight as 1 | 2 | 3].label}
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {interests.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card px-4 py-3"
          style={{ borderRadius: 'var(--radius-md)' }}
        >
          <p style={{ fontSize: '12px', color: 'var(--et-muted)', lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--et-blue)' }}>High</strong> interests get 3× weight in your feed.{' '}
            <strong style={{ color: 'var(--et-purple)' }}>Medium</strong> get 2×.{' '}
            <strong style={{ color: 'var(--et-muted)' }}>Low</strong> still influence recommendations.
          </p>
        </motion.div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={nextStep}
        disabled={interests.length === 0}
        className="btn-primary w-full"
        style={{
          height: '52px',
          borderRadius: 'var(--radius-lg)',
          fontSize: '15px',
          opacity: interests.length === 0 ? 0.4 : 1,
        }}
      >
        {interests.length > 0 ? `Continue (${interests.length} selected)` : 'Pick at least one'}
      </motion.button>
    </div>
  )
}
