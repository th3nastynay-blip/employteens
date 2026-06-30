'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'

const ease = [0.22, 1, 0.36, 1] as const

export function Step10Resume() {
  const { setResumeFile, nextStep } = useOnboardingStore()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    if (f.size > 5 * 1024 * 1024) {
      alert('File must be under 5MB.')
      return
    }
    setFile(f)
    setResumeFile(f)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="section-label" style={{ color: 'var(--et-blue)' }}>Step 10 of 11</p>
        <h2 className="text-h1" style={{ color: 'var(--et-ink)' }}>Got a resume?</h2>
        <p style={{ fontSize: '14px', color: 'var(--et-muted)', lineHeight: 1.5 }}>
          Optional — but employers notice. If you don&apos;t have one, ask the AI Coach to build one for you after setup.
        </p>
      </div>

      {/* Drop zone */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          width: '100%', padding: '32px 20px', borderRadius: 'var(--radius-xl)',
          border: `2px dashed ${dragOver ? 'var(--et-blue)' : file ? 'rgba(37,99,235,0.35)' : 'var(--et-border-mid)'}`,
          background: file ? 'var(--et-blue-light)' : dragOver ? 'var(--et-blue-light)' : 'var(--et-surface)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          cursor: 'pointer', transition: 'all 0.15s ease',
        }}
      >
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="file"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--et-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M5 4H14L19 9V18C19 18.55 18.55 19 18 19H4C3.45 19 3 18.55 3 18V5C3 4.45 3.45 4 4 4H5Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M14 4V9H19" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M7 13H15M7 16H11" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--et-blue)' }}>{file.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--et-blue-mid)' }}>{(file.size / 1024).toFixed(0)} KB · Tap to change</p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2"
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--et-ground)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 4V14M7 10L11 14L15 10" stroke="var(--et-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 18H18" stroke="var(--et-muted)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--et-subtle)' }}>Tap to upload resume</p>
              <p style={{ fontSize: '12px', color: 'var(--et-placeholder)' }}>PDF or Word · Max 5MB</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleChange} />

      <div className="flex flex-col gap-2.5">
        <button
          onClick={nextStep}
          className="btn-primary w-full"
          style={{ height: 52, borderRadius: 'var(--radius-lg)', fontSize: '15px' }}
        >
          {file ? 'Continue with resume →' : 'Continue without resume'}
        </button>
      </div>
    </div>
  )
}
