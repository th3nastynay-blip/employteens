'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import { createClient } from '@/lib/supabase/client'

const AI_STEPS = [
  { text: 'Building your profile…', duration: 1200 },
  { text: 'Scanning jobs in your area…', duration: 1400 },
  { text: 'Analyzing employer reliability…', duration: 1200 },
  { text: 'Matching your schedule…', duration: 1400 },
  { text: 'Scoring for teen-friendliness…', duration: 1200 },
  { text: 'Ranking your top matches…', duration: 1000 },
  { text: 'Your feed is ready!', duration: 800 },
]

export function Step11Processing() {
  const store = useOnboardingStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let elapsed = 0
    const timers: NodeJS.Timeout[] = []

    AI_STEPS.forEach((step, i) => {
      const t = setTimeout(() => {
        setCurrentStep(i)
        if (i === AI_STEPS.length - 1) {
          setTimeout(() => setDone(true), step.duration)
        }
      }, elapsed)
      timers.push(t)
      elapsed += step.duration
    })

    // Save profile to Supabase in background
    saveProfile()

    return () => timers.forEach(clearTimeout)
  }, [])

  async function saveProfile() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Upload resume if present
      let resume_url = store.resume_url
      if (store.resume_file) {
        const ext = store.resume_file.name.split('.').pop()
        const path = `resumes/${user.id}.${ext}`
        const { data } = await supabase.storage
          .from('resumes')
          .upload(path, store.resume_file, { upsert: true })
        if (data) {
          const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(path)
          resume_url = urlData.publicUrl
        }
      }

      await supabase.from('users').upsert({
        id: user.id,
        name: store.name,
        age: store.age!,
        state: store.state,
        zip_code: store.zip_code,
        transportation: store.transportation,
        school_grade: store.school_grade,
        school_end_time: store.school_end_time,
        availability: store.availability,
        skills: store.skills,
        interests: store.interests,
        resume_url,
        onboarding_completed: true,
      })

      store.setResumeUrl(resume_url)
    } catch (err) {
      console.error('Profile save error:', err)
    }
  }

  useEffect(() => {
    if (done) {
      store.nextStep()
    }
  }, [done, store])

  const progress = ((currentStep + 1) / AI_STEPS.length) * 100

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-10">
      {/* Animated logo */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-20 h-20 rounded-3xl bg-[#3B82F6] flex items-center justify-center shadow-xl shadow-blue-200"
      >
        <span className="text-white text-3xl font-bold">ET</span>
      </motion.div>

      {/* Progress ring */}
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="#E5E7EB" strokeWidth="6" />
          <motion.circle
            cx="48" cy="48" r="40"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={251.2}
            animate={{ strokeDashoffset: 251.2 * (1 - progress / 100) }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-[#111111]">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* AI state text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={currentStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-center text-lg font-medium text-[#111111]"
        >
          {AI_STEPS[currentStep]?.text}
        </motion.p>
      </AnimatePresence>

      <p className="text-sm text-[#9CA3AF] text-center">
        This only takes a few seconds…
      </p>
    </div>
  )
}
