'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import { createClient } from '@/lib/supabase/client'
import { serializeTransportation, serializeInterests } from '@/lib/types/onboarding'

const AI_STEPS = [
  { text: 'Building your profile…', duration: 1100 },
  { text: 'Scanning jobs in your area…', duration: 1300 },
  { text: 'Analyzing your schedule…', duration: 1100 },
  { text: 'Matching your interests…', duration: 1200 },
  { text: 'Scoring employer reliability…', duration: 1000 },
  { text: 'Ranking your top matches…', duration: 900 },
  { text: 'Your feed is ready!', duration: 700 },
]

const TOTAL_ANIM_MS = AI_STEPS.reduce((sum, s) => sum + s.duration, 0)

export function Step11Processing() {
  const store = useOnboardingStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [animDone, setAnimDone] = useState(false)
  const [saveDone, setSaveDone] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const advanced = useRef(false)

  // Advance only when BOTH animation finished AND save succeeded
  useEffect(() => {
    if (animDone && saveDone && !advanced.current) {
      advanced.current = true
      store.nextStep()
    }
  }, [animDone, saveDone])

  useEffect(() => {
    let elapsed = 0
    const timers: NodeJS.Timeout[] = []

    AI_STEPS.forEach((step, i) => {
      const t = setTimeout(() => {
        setCurrentStep(i)
        if (i === AI_STEPS.length - 1) {
          setTimeout(() => setAnimDone(true), step.duration)
        }
      }, elapsed)
      timers.push(t)
      elapsed += step.duration
    })

    saveProfile()
    return () => timers.forEach(clearTimeout)
  }, [])

  async function saveProfile() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setSaveError(true)
        return
      }

      // Upload resume if file present
      let resume_url = store.resume_url
      if (store.resume_file) {
        const ext = store.resume_file.name.split('.').pop()
        const path = `resumes/${user.id}.${ext}`
        const { data: uploadData } = await supabase.storage
          .from('resumes')
          .upload(path, store.resume_file, { upsert: true })
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(path)
          resume_url = urlData.publicUrl
          store.setResumeUrl(resume_url)
        }
      }

      const transportationSerialized = serializeTransportation(store.transportation)
      const interestsSerialized = serializeInterests(store.interests)

      const { error } = await supabase.from('users').upsert({
        id: user.id,
        name: store.name,
        age: store.age!,
        state: store.state,
        zip_code: store.zip_code,
        transportation: transportationSerialized,
        school_grade: store.school_grade,
        school_end_time: store.school_end_time,
        availability: store.availability,
        skills: store.skills,
        interests: interestsSerialized,
        resume_url,
        onboarding_completed: true,
      })

      if (error) {
        console.error('[Profile save]', error)
        setSaveError(true)
        return
      }

      // Fire-and-forget: kick off match generation for this user
      // Don't await — dashboard will fall back to on-the-fly matching if needed
      fetch('/api/match-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      }).catch(() => {/* non-critical */})

      setSaveDone(true)
    } catch (err) {
      console.error('[Profile save exception]', err)
      setSaveError(true)
    }
  }

  // If save errored but animation finished, still advance after a short wait
  useEffect(() => {
    if (saveError && animDone && !advanced.current) {
      const t = setTimeout(() => {
        if (!advanced.current) {
          advanced.current = true
          store.nextStep()
        }
      }, 2000)
      return () => clearTimeout(t)
    }
  }, [saveError, animDone])

  const progress = ((currentStep + 1) / AI_STEPS.length) * 100
  const r = 38
  const circ = 2 * Math.PI * r

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-10">
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg width="72" height="72" viewBox="0 0 52 52" fill="none">
          <defs>
            <linearGradient id="procLg" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2563EB" />
              <stop offset="1" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          <rect width="52" height="52" rx="16" fill="url(#procLg)" />
          <path d="M29 9L17 28H25L23 43L35 24H27L29 9Z" fill="white" fillOpacity="0.95" />
        </svg>
      </motion.div>

      <div className="relative" style={{ width: 96, height: 96 }}>
        <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="procRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop stopColor="#2563EB" />
              <stop offset="1" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          <circle cx="48" cy="48" r={r} fill="none" stroke="var(--et-ground)" strokeWidth="6" />
          <motion.circle
            cx="48" cy="48" r={r}
            fill="none"
            stroke="url(#procRing)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            animate={{ strokeDashoffset: circ * (1 - progress / 100) }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--et-ink)' }}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={currentStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          style={{ fontSize: '17px', fontWeight: 600, color: 'var(--et-ink)', textAlign: 'center', letterSpacing: '-0.01em' }}
        >
          {AI_STEPS[currentStep]?.text}
        </motion.p>
      </AnimatePresence>

      <p style={{ fontSize: '13px', color: 'var(--et-placeholder)', textAlign: 'center' }}>
        {saveError ? 'Having trouble saving — retrying…' : 'This only takes a few seconds…'}
      </p>
    </div>
  )
}
