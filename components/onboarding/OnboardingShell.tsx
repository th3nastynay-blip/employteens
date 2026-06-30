'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'

const TOTAL_STEPS = 13

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d < 0 ? '100%' : '-100%', opacity: 0 }),
}

const spring = { type: 'spring' as const, stiffness: 380, damping: 38 }

interface OnboardingShellProps {
  children: React.ReactNode
  direction?: number
}

export function OnboardingShell({ children, direction = 1 }: OnboardingShellProps) {
  const step = useOnboardingStore((s) => s.step)
  const prevStep = useOnboardingStore((s) => s.prevStep)

  const showBack = step > 0 && step < 12
  const progress = Math.min((step / (TOTAL_STEPS - 1)) * 100, 100)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--et-surface)' }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--et-ground)', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
        <motion.div
          style={{ height: '100%', background: 'linear-gradient(90deg, var(--et-blue), var(--et-purple))' }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Back button */}
      {showBack && (
        <button
          onClick={prevStep}
          style={{
            position: 'fixed', top: 16, left: 16, zIndex: 40,
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--et-surface)',
            border: '1px solid var(--et-border-mid)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 13.5L6.5 9L11 4.5" stroke="var(--et-ink)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Step counter */}
      {step > 0 && step < 12 && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 40 }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--et-placeholder)' }}>
            {step} / 11
          </p>
        </div>
      )}

      {/* Slide content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
            className="pt-16 pb-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
