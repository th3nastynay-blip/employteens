'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserProfile } from '@/lib/types/database'

const ease = [0.22, 1, 0.36, 1] as const

function getCompletionScore(profile: UserProfile): { score: number; missing: string[] } {
  const checks = [
    { key: 'name', label: 'Name', done: !!profile.name },
    { key: 'age', label: 'Age', done: !!profile.age },
    { key: 'zip', label: 'ZIP code', done: !!profile.zip_code },
    { key: 'transport', label: 'Transportation', done: !!profile.transportation },
    { key: 'school', label: 'School grade', done: !!profile.school_grade },
    { key: 'availability', label: 'Availability', done: Object.values(profile.availability ?? {}).some(Boolean) },
    { key: 'skills', label: 'Skills', done: (profile.skills as string[]).length > 0 },
    { key: 'interests', label: 'Interests', done: (profile.interests as string[]).length > 0 },
    { key: 'resume', label: 'Resume', done: !!profile.resume_url },
  ]
  const done = checks.filter((c) => c.done).length
  const missing = checks.filter((c) => !c.done).map((c) => c.label)
  return { score: Math.round((done / checks.length) * 100), missing }
}

function CompletionRing({ score }: { score: number }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="relative" style={{ width: 48, height: 48 }}>
      <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="pRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop stopColor="#2563EB" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--et-ground)" strokeWidth="4.5" />
        <motion.circle
          cx="24" cy="24" r={r}
          fill="none"
          stroke="url(#pRing)"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease, delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--et-blue)' }}>{score}%</span>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="section-label px-1">{title}</p>
      {children}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div
      className="card flex items-center gap-3.5 px-4 py-3.5"
      style={{ borderRadius: 'var(--radius-lg)' }}
    >
      <span style={{ fontSize: '20px', flexShrink: 0 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: '11px', color: 'var(--et-placeholder)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </p>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--et-ink)', marginTop: '1px', textTransform: 'capitalize' }}>
          {value}
        </p>
      </div>
    </div>
  )
}

function ChipList({ items, color = 'blue' }: { items: string[]; color?: 'blue' | 'subtle' }) {
  return (
    <div
      className="card px-4 py-4"
      style={{ borderRadius: 'var(--radius-lg)' }}
    >
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={`badge ${color === 'blue' ? 'badge-blue' : 'badge-subtle'}`}
            style={{ fontSize: '12px', padding: '5px 12px' }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function AvailabilityGrid({ availability }: { availability: Record<string, boolean> }) {
  const days = [
    { key: 'monday', short: 'Mon' },
    { key: 'tuesday', short: 'Tue' },
    { key: 'wednesday', short: 'Wed' },
    { key: 'thursday', short: 'Thu' },
    { key: 'friday', short: 'Fri' },
    { key: 'saturday', short: 'Sat' },
    { key: 'sunday', short: 'Sun' },
  ]

  return (
    <div className="card px-4 py-4" style={{ borderRadius: 'var(--radius-lg)' }}>
      <div className="flex gap-1.5">
        {days.map(({ key, short }) => {
          const available = availability[key]
          return (
            <div
              key={key}
              className="flex-1 flex flex-col items-center gap-1.5"
            >
              <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--et-placeholder)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {short}
              </p>
              <div
                style={{
                  width: 28, height: 28,
                  borderRadius: 'var(--radius-xs)',
                  background: available ? 'var(--et-blue-light)' : 'var(--et-ground)',
                  border: available ? '1.5px solid rgba(37,99,235,0.25)' : '1.5px solid var(--et-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {available && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="var(--et-blue)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [appCount, setAppCount] = useState(0)
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profileData }, { count: saved }, { count: applied }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'saved'),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'applied'),
      ])

      if (profileData) setProfile(profileData as unknown as UserProfile)
      setSavedCount(saved ?? 0)
      setAppCount(applied ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="px-5 pt-12 flex flex-col gap-4">
        {[72, 48, 48, 80, 80].map((h, i) => (
          <div key={i} className="skeleton" style={{ height: h, borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
    )
  }

  if (!profile) return null

  const skills = (profile.skills ?? []) as string[]
  const interests = (profile.interests ?? []) as string[]
  const availability = (profile.availability ?? {}) as Record<string, boolean>
  const { score: completion, missing } = getCompletionScore(profile)
  const firstName = profile.name?.split(' ')[0] ?? 'You'

  return (
    <div className="flex flex-col pb-6">
      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-6">
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: '14px', color: 'var(--et-muted)', fontWeight: 500 }}
        >
          Your profile
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          style={{ fontSize: '26px', fontWeight: 800, color: 'var(--et-ink)', letterSpacing: '-0.03em', marginTop: 3 }}
        >
          {profile.name}
        </motion.h1>
      </div>

      <div className="px-5 flex flex-col gap-5">

        {/* ── Identity card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease }}
          className="card-elevated px-5 py-5"
          style={{ borderRadius: 'var(--radius-xl)' }}
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              style={{
                width: 56, height: 56,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: 'var(--shadow-match)',
              }}
            >
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
                {profile.name?.[0]?.toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--et-ink)', letterSpacing: '-0.01em' }}>
                {profile.name}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: '1px' }}>
                Age {profile.age} · {profile.state} {profile.zip_code}
              </p>
            </div>

            <CompletionRing score={completion} />
          </div>

          {/* Stats row */}
          <div
            className="flex gap-4 mt-4 pt-4"
            style={{ borderTop: '1px solid var(--et-border)' }}
          >
            {[
              { label: 'Saved jobs', value: savedCount },
              { label: 'Applied', value: appCount },
              { label: 'Profile', value: `${completion}%` },
            ].map(({ label, value }) => (
              <div key={label} className="flex-1 text-center">
                <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--et-ink)', letterSpacing: '-0.02em' }}>{value}</p>
                <p style={{ fontSize: '11px', color: 'var(--et-placeholder)', marginTop: '1px', fontWeight: 500 }}>{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Completion nudge ── */}
        <AnimatePresence>
          {missing.length > 0 && completion < 100 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="match-gradient-subtle rounded-2xl px-4 py-3.5 flex items-start gap-3"
              style={{ border: '1px solid rgba(37,99,235,0.12)' }}
            >
              <span style={{ fontSize: '16px', flexShrink: 0 }}>✨</span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--et-blue)' }}>
                  Complete your profile for better matches
                </p>
                <p style={{ fontSize: '12px', color: 'var(--et-subtle)', marginTop: '2px' }}>
                  Missing: {missing.slice(0, 3).join(', ')}{missing.length > 3 ? ` +${missing.length - 3} more` : ''}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Personal ── */}
        <Section title="Personal">
          <InfoRow icon="🎓" label="School Grade" value={`${profile.school_grade} grade`} />
          <InfoRow icon="🕐" label="School Ends" value={profile.school_end_time} />
          <InfoRow icon="🚌" label="Transportation" value={profile.transportation?.replace(/_/g, ' ')} />
        </Section>

        {/* ── Availability ── */}
        <Section title="Availability">
          {Object.values(availability).some(Boolean) ? (
            <AvailabilityGrid availability={availability} />
          ) : (
            <div className="card px-4 py-3.5" style={{ borderRadius: 'var(--radius-lg)' }}>
              <p style={{ fontSize: '13px', color: 'var(--et-placeholder)' }}>Not set — complete your profile to add availability</p>
            </div>
          )}
        </Section>

        {/* ── Skills ── */}
        {skills.length > 0 && (
          <Section title="Skills">
            <ChipList items={skills} color="subtle" />
          </Section>
        )}

        {/* ── Interests ── */}
        {interests.length > 0 && (
          <Section title="Interests">
            <ChipList items={interests} color="blue" />
          </Section>
        )}

        {/* ── Resume ── */}
        <Section title="Resume">
          {profile.resume_url ? (
            <a
              href={profile.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="card flex items-center gap-3.5 px-4 py-3.5"
              style={{ borderRadius: 'var(--radius-lg)', textDecoration: 'none' }}
            >
              <div
                style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  background: 'var(--et-blue-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 3H13L17 7V17C17 17.55 16.55 18 16 18H4C3.45 18 3 17.55 3 17V4C3 3.45 3.45 3 4 3H5Z" stroke="var(--et-blue)" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M13 3V7H17" stroke="var(--et-blue)" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M7 11H13M7 14H10" stroke="var(--et-blue)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="flex-1">
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--et-ink)' }}>Resume uploaded</p>
                <p style={{ fontSize: '12px', color: 'var(--et-blue)', marginTop: '1px' }}>Tap to view →</p>
              </div>
            </a>
          ) : (
            <div className="card px-4 py-3.5 flex items-center gap-3.5" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div
                style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  background: 'var(--et-ground)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 5V15M5 10H15" stroke="var(--et-placeholder)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--et-subtle)' }}>No resume yet</p>
                <p style={{ fontSize: '12px', color: 'var(--et-placeholder)', marginTop: '1px' }}>Ask AI Coach to build one for you</p>
              </div>
            </div>
          )}
        </Section>

        {/* ── Sign out ── */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSignOut}
          style={{
            width: '100%', height: 48,
            borderRadius: 'var(--radius-full)',
            background: 'none',
            border: '1.5px solid var(--et-border-mid)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--et-muted)',
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          Sign out
        </motion.button>

      </div>
    </div>
  )
}
