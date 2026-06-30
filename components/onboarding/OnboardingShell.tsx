'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'

const TOTAL_STEPS = 13 // 0–12 (step 12 = AI processing)

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
}

const spring = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 38,
}

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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100 fixed top-0 left-0 right-0 z-50">
        <motion.div
          className="h-full bg-[#3B82F6]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Back button */}
      {showBack && (
        <button
          onClick={prevStep}
          className="fixed top-4 left-4 z-40 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
            className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-16 pb-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
