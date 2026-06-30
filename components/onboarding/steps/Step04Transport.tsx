'use client'

import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import { TRANSPORTATION_OPTIONS, type Transportation } from '@/lib/types/onboarding'

export function Step04Transport() {
  const { transportation, toggleTransportation, nextStep } = useOnboardingStore()

  const canContinue = transportation.length > 0
  const primaryMode = transportation[0]

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="section-label" style={{ color: 'var(--et-blue)' }}>Step 4 of 12</p>
        <h2 className="text-h1">How do you get around?</h2>
        <p style={{ fontSize: '14px', color: 'var(--et-muted)', lineHeight: 1.5 }}>
          Select all that apply — your first pick is your primary method.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {TRANSPORTATION_OPTIONS.map(({ value, label, emoji, desc, rangeLabel }, i) => {
          const selected = transportation.includes(value)
          const isPrimary = primaryMode === value
          const selectionIndex = transportation.indexOf(value)

          return (
            <motion.button
              key={value}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggleTransportation(value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                border: selected
                  ? '1.5px solid rgba(37,99,235,0.35)'
                  : '1.5px solid var(--et-border-mid)',
                background: selected ? 'var(--et-blue-light)' : 'var(--et-surface)',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: selected ? '0 0 0 3px var(--et-blue-glow)' : 'none',
              }}
            >
              <span style={{ fontSize: '24px', flexShrink: 0 }}>{emoji}</span>

              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: selected ? 'var(--et-blue)' : 'var(--et-ink)',
                    letterSpacing: '-0.01em',
                  }}>
                    {label}
                  </p>
                  {isPrimary && (
                    <span
                      className="badge"
                      style={{
                        background: 'var(--et-blue)',
                        color: '#fff',
                        fontSize: '9px',
                        padding: '2px 7px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      PRIMARY
                    </span>
                  )}
                  {selected && !isPrimary && (
                    <span className="badge badge-blue" style={{ fontSize: '9px', padding: '2px 7px' }}>
                      +{selectionIndex + 1}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--et-muted)', marginTop: '1px' }}>
                  {desc} · <span style={{ color: selected ? 'var(--et-blue)' : 'var(--et-placeholder)' }}>{rangeLabel}</span>
                </p>
              </div>

              {/* Checkbox */}
              <div
                style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: selected ? '2px solid var(--et-blue)' : '2px solid var(--et-border-mid)',
                  background: selected ? 'var(--et-blue)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.12s ease',
                }}
              >
                {selected && (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {transportation.length > 1 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ fontSize: '12px', color: 'var(--et-muted)', textAlign: 'center', marginTop: -12 }}
        >
          Your first selection ({TRANSPORTATION_OPTIONS.find(o => o.value === primaryMode)?.label}) is your primary method.
        </motion.p>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={nextStep}
        disabled={!canContinue}
        className="btn-primary w-full"
        style={{
          height: '52px',
          borderRadius: 'var(--radius-lg)',
          fontSize: '15px',
          opacity: canContinue ? 1 : 0.4,
        }}
      >
        {canContinue
          ? `Continue${transportation.length > 1 ? ` (${transportation.length} methods)` : ''}`
          : 'Select at least one'}
      </motion.button>
    </div>
  )
}
