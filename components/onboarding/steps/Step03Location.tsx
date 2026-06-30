'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'

export function Step03Location() {
  const { state, zip_code, setState, setZipCode, nextStep } = useOnboardingStore()
  const [selectedState, setSelectedState] = useState<'NY' | 'NJ' | ''>(state)
  const [zip, setZip] = useState(zip_code)
  const [zipError, setZipError] = useState('')

  function handleContinue() {
    if (!selectedState) return
    if (zip.length !== 5 || !/^\d{5}$/.test(zip)) {
      setZipError('Enter a valid 5-digit ZIP code')
      return
    }
    setState(selectedState)
    setZipCode(zip)
    nextStep()
  }

  const canContinue = selectedState && zip.length === 5 && /^\d{5}$/.test(zip)

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="section-label" style={{ color: 'var(--et-blue)' }}>Step 3 of 11</p>
        <h2 className="text-h1" style={{ color: 'var(--et-ink)' }}>Where are you located?</h2>
        <p style={{ fontSize: '14px', color: 'var(--et-muted)' }}>We only show jobs reachable from your ZIP code.</p>
      </div>

      {/* State picker */}
      <div className="flex flex-col gap-3">
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--et-subtle)' }}>State</p>
        <div className="flex gap-3">
          {(['NY', 'NJ'] as const).map((s) => {
            const on = selectedState === s
            return (
              <motion.button
                key={s}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedState(s)}
                style={{
                  flex: 1, height: 64, borderRadius: 'var(--radius-lg)',
                  border: on ? '2px solid var(--et-blue)' : '1.5px solid var(--et-border-mid)',
                  background: on ? 'var(--et-blue)' : 'var(--et-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  boxShadow: on ? 'var(--shadow-blue-sm)' : 'none',
                }}
              >
                <span style={{ fontSize: '20px', fontWeight: 800, color: on ? '#fff' : 'var(--et-ink)' }}>{s}</span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* ZIP code */}
      <div className="flex flex-col gap-2">
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--et-subtle)' }}>ZIP Code</p>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={zip}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 5)
            setZip(v)
            setZipError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
          placeholder="e.g. 10001"
          className="input"
          style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '0.08em' }}
        />
        {zipError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: '13px', color: 'var(--et-red)', fontWeight: 500 }}
          >
            {zipError}
          </motion.p>
        )}
      </div>

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className="btn-primary w-full"
        style={{ height: 52, borderRadius: 'var(--radius-lg)', fontSize: '15px', opacity: canContinue ? 1 : 0.4 }}
      >
        Continue
      </button>
    </div>
  )
}
