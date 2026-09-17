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

/** Two automatic retries, then hand control back to the user. */
const MAX_RETRIES = 2

export function Step11Processing() {
  const store = useOnboardingStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [animDone, setAnimDone] = useState(false)
  const [saveDone, setSaveDone] = useState(false)
  const [saveError, setSaveError] = useState(false)
  /** The database's own words, shown to the user instead of swallowed. */
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const advanced = useRef(false)
  const retryCount = useRef(0)

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
        setSaveErrorMessage('You are not signed in any more. Log in and we will keep your answers.')
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
        setSaveErrorMessage(error.message || 'The database rejected the save.')
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
      setSaveErrorMessage(err instanceof Error ? err.message : 'Could not reach the server.')
      setSaveError(true)
    }
  }

  /**
   * A FAILED SAVE USED TO LOOK EXACTLY LIKE A SUCCESSFUL ONE.
   *
   * This block read:
   *
   *   // If save errored but animation finished, still advance after a short wait
   *   if (saveError && animDone && !advanced.current) {
   *     setTimeout(() => { advanced.current = true; store.nextStep() }, 2000)
   *   }
   *
   * So when the write to `users` failed, the app waited two seconds and walked
   * the teen to the dashboard as though onboarding had completed. The only
   * signal was a caption reading "Having trouble saving — retrying…", and
   * nothing retried. The word was simply false.
   *
   * Observed on production 2026-09-17: the founder set his age from 14 to 18,
   * watched the success animation, landed on the dashboard, and the profile
   * was still 14 on the next page load. Every downstream symptom — the feed
   * not changing, 243 paid jobs staying invisible, "273 jobs unlock at 16"
   * appearing on an adult account — was this one silent failure.
   *
   * Swallowing a write error is the worst option available here. The teen
   * loses the answers they just typed and does not find out until something
   * else looks broken, by which point the cause is invisible.
   *
   * Now: retry twice with backoff, and if it still fails, STOP. Show what the
   * database actually said and offer a button. Never advance on a failed save.
   */
  useEffect(() => {
    if (!saveError || !animDone || advanced.current || retrying) return
    if (retryCount.current >= MAX_RETRIES) return

    const delay = 1200 * (retryCount.current + 1)
    const t = setTimeout(() => {
      retryCount.current += 1
      setRetrying(true)
      setSaveError(false)
      void saveProfile().finally(() => setRetrying(false))
    }, delay)
    return () => clearTimeout(t)
  }, [saveError, animDone, retrying])

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
        {retrying
          ? 'Trying again…'
          : saveError && retryCount.current >= MAX_RETRIES
            ? 'We could not save your answers.'
            : saveError
              ? 'Having trouble saving — trying again…'
              : 'This only takes a few seconds…'}
      </p>

      {/* The dead end, made visible.
       *
       * Reached only after two failed retries. The teen stays on this screen
       * with their answers still in the store, so tapping Try again re-sends
       * exactly what they typed. Nothing advances, because advancing on a
       * failed save is what hid this bug for weeks.
       *
       * The database's own message is shown verbatim. It is not pretty, but a
       * teen can read it to an adult and an adult can act on it, which is more
       * than "something went wrong" has ever done for anyone. */}
      {saveError && !retrying && retryCount.current >= MAX_RETRIES && (
        <div
          style={{
            width: '100%',
            border: '1px solid var(--et-red, #DC2626)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '14px 16px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--et-ink)' }}>
            Your answers are still here — nothing is lost.
          </p>
          {saveErrorMessage && (
            <p style={{ fontSize: '11.5px', color: 'var(--et-placeholder)', marginTop: 6, lineHeight: 1.45, wordBreak: 'break-word' }}>
              {saveErrorMessage}
            </p>
          )}
          <button
            className="btn-primary"
            style={{ marginTop: 12, borderRadius: 'var(--radius-full)', fontSize: '14px' }}
            onClick={() => {
              retryCount.current = 0
              setSaveErrorMessage(null)
              setSaveError(false)
              setRetrying(true)
              void saveProfile().finally(() => setRetrying(false))
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
