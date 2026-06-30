'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  deserializeTransportation,
  deserializeInterests,
  TRANSPORTATION_OPTIONS,
  GRADE_LABELS,
  type Transportation,
  type WeightedInterest,
} from '@/lib/types/onboarding'
import type { UserProfile } from '@/lib/types/database'

const ease = [0.22, 1, 0.36, 1] as const

// ── AI Insights engine ────────────────────────────────────────────────
function generateInsights(
  profile: UserProfile,
  transports: Transportation[],
  interests: WeightedInterest[],
  savedCount: number,
  appliedCount: number,
): string[] {
  const insights: string[] = []
  const availability = profile.availability as Record<string, boolean>

  const availableDays = Object.entries(availability ?? {}).filter(([, v]) => v).map(([k]) => k)
  const hasWeekend = availability?.saturday || availability?.sunday
  const hasWeekdays = ['monday','tuesday','wednesday','thursday','friday'].some((d) => availability?.[d])

  if (hasWeekend && hasWeekdays) {
    insights.push('You have strong availability — both weekdays and weekends unlock more employer options.')
  } else if (hasWeekend && !hasWeekdays) {
    insights.push('Weekend-only availability focuses your feed on retail, food, and entertainment employers who prefer weekend staff.')
  } else if (!hasWeekend && hasWeekdays) {
    insights.push('Weekday-only availability works well for after-school programs, tutoring, and office support roles.')
  }

  if (transports.includes('public_transit')) {
    insights.push('Public transit access increases your eligible job radius by up to 10 miles — significantly more options than walking alone.')
  }
  if (transports.length >= 3) {
    insights.push('Multiple transport options give you the widest job reach of any profile type.')
  }

  const topInterest = interests.sort((a, b) => b.weight - a.weight)[0]
  if (topInterest) {
    const interestMap: Record<string, string> = {
      'Food & Restaurants': 'food service roles with flexible after-school hours',
      'Retail & Shopping': 'retail positions — some of the most teen-friendly employers in NY/NJ',
      'Technology': 'tech-adjacent roles like IT support and help desk (rare but high-paying for teens)',
      'Customer Service': 'front-facing roles where communication skills shine',
      'Entertainment & Movies': 'entertainment venues with great employee perks',
    }
    const mapping = interestMap[topInterest.name]
    if (mapping) {
      insights.push(`Your top interest (${topInterest.name}) aligns with ${mapping}.`)
    }
  }

  if (availableDays.length >= 5) {
    insights.push('Your wide availability makes you a preferred candidate — most employers want flexibility.')
  }

  if (savedCount > 0 && appliedCount === 0) {
    insights.push(`You've saved ${savedCount} job${savedCount > 1 ? 's' : ''} but haven't applied yet. Apply this week — employers notice recent applicants first.`)
  }

  return insights.slice(0, 4)
}

// ── Completion score ──────────────────────────────────────────────────
function getCompletion(profile: UserProfile, transports: Transportation[], interests: WeightedInterest[]): {
  score: number
  missing: string[]
} {
  const checks = [
    { label: 'Name', done: !!profile.name },
    { label: 'Age', done: !!profile.age },
    { label: 'Location', done: !!profile.zip_code },
    { label: 'Transportation', done: transports.length > 0 },
    { label: 'School grade', done: !!profile.school_grade },
    { label: 'Availability', done: Object.values(profile.availability as Record<string, boolean> ?? {}).some(Boolean) },
    { label: 'Interests', done: interests.length > 0 },
    { label: 'Skills', done: (profile.skills as string[]).length > 0 },
    { label: 'Resume', done: !!profile.resume_url },
  ]
  const done = checks.filter((c) => c.done).length
  return {
    score: Math.round((done / checks.length) * 100),
    missing: checks.filter((c) => !c.done).map((c) => c.label),
  }
}

// ── Components ────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--et-placeholder)', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0 4px' }}>
      {children}
    </p>
  )
}

function ProfileCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card" style={{ borderRadius: 'var(--radius-xl)', ...style }}>
      {children}
    </div>
  )
}

function AvailabilityGrid({ availability }: { availability: Record<string, boolean> }) {
  const days = [
    { key: 'monday', short: 'M' },
    { key: 'tuesday', short: 'T' },
    { key: 'wednesday', short: 'W' },
    { key: 'thursday', short: 'T' },
    { key: 'friday', short: 'F' },
    { key: 'saturday', short: 'S' },
    { key: 'sunday', short: 'S' },
  ]
  return (
    <div className="flex gap-2 pt-3">
      {days.map(({ key, short }) => {
        const on = availability[key]
        return (
          <div key={key} className="flex flex-col items-center gap-1.5 flex-1">
            <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--et-placeholder)', textTransform: 'uppercase' }}>{short}</p>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: on ? 'var(--et-blue)' : 'var(--et-ground)',
              border: on ? 'none' : '1.5px solid var(--et-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {on && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CompletionRing({ score }: { score: number }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div className="relative flex-shrink-0" style={{ width: 44, height: 44 }}>
      <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="pCompRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop stopColor="#2563EB" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--et-ground)" strokeWidth="4" />
        <motion.circle
          cx="22" cy="22" r={r}
          fill="none" stroke="url(#pCompRing)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease, delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--et-blue)' }}>{score}%</span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedCount, setSavedCount] = useState(0)
  const [appliedCount, setAppliedCount] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      try {
        const [
          { data: profileData },
          { count: saved },
          { count: applied },
        ] = await Promise.all([
          supabase.from('users').select('*').eq('id', user.id).single(),
          supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'saved'),
          supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'applied'),
        ])
        if (profileData) setProfile(profileData as unknown as UserProfile)
        setSavedCount(saved ?? 0)
        setAppliedCount(applied ?? 0)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  // ── Loading skeleton ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="px-5 pt-12 flex flex-col gap-4">
        {[80, 200, 120, 160, 100].map((h, i) => (
          <div key={i} className="skeleton" style={{ height: h, borderRadius: 'var(--radius-xl)' }} />
        ))}
      </div>
    )
  }

  // ── No profile ──────────────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="px-5 flex flex-col items-center gap-5" style={{ paddingTop: 80 }}>
        <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--et-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>
        <div style={{ textAlign: 'center' }}>
          <h2 className="text-h2" style={{ color: 'var(--et-ink)' }}>Profile not set up yet</h2>
          <p style={{ fontSize: '14px', color: 'var(--et-muted)', marginTop: 6, lineHeight: 1.5 }}>
            Complete onboarding to unlock AI job matches.
          </p>
        </div>
        <a href="/onboarding"><button className="btn-primary" style={{ borderRadius: 'var(--radius-full)' }}>Complete onboarding →</button></a>
        <button onClick={handleSignOut} style={{ background: 'none', border: 'none', fontSize: '14px', color: 'var(--et-muted)', cursor: 'pointer', fontWeight: 500 }}>Sign out</button>
      </div>
    )
  }

  // ── Deserialize stored data ─────────────────────────────────────────
  const transports = deserializeTransportation(profile.transportation as string)
  const interests: WeightedInterest[] = deserializeInterests(profile.interests)
  const skills = (profile.skills as string[]) ?? []
  const availability = (profile.availability as Record<string, boolean>) ?? {}
  const { score: completion, missing } = getCompletion(profile, transports, interests)
  const insights = generateInsights(profile, transports, interests, savedCount, appliedCount)
  const gradeLabel = GRADE_LABELS[profile.school_grade as keyof typeof GRADE_LABELS] ?? profile.school_grade
  const availableDays = Object.entries(availability).filter(([, v]) => v).map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
  const primaryTransport = transports[0]
  const primaryTransportOption = TRANSPORTATION_OPTIONS.find((o) => o.value === primaryTransport)

  return (
    <div className="flex flex-col pb-8">

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-6">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: '13px', color: 'var(--et-muted)', fontWeight: 500 }}>
          Your career profile
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="text-h1" style={{ color: 'var(--et-ink)', marginTop: 3 }}>
          {profile.name}
        </motion.h1>
      </div>

      <div className="px-4 flex flex-col gap-4">

        {/* ── Career Snapshot ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease }}>
          <ProfileCard style={{ padding: '20px' }}>
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div style={{
                width: 56, height: 56, borderRadius: 'var(--radius-md)', flexShrink: 0,
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--shadow-match)',
              }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>{profile.name?.[0]?.toUpperCase()}</span>
              </div>

              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--et-ink)', letterSpacing: '-0.01em' }}>{profile.name}</p>
                <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: 1 }}>
                  Age {profile.age} · {profile.state} {profile.zip_code}
                </p>
                {gradeLabel && (
                  <p style={{ fontSize: '12px', color: 'var(--et-placeholder)', marginTop: 2 }}>{gradeLabel}</p>
                )}
              </div>

              <CompletionRing score={completion} />
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 0, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--et-border)' }}>
              {[
                { label: 'Saved', value: savedCount },
                { label: 'Applied', value: appliedCount },
                { label: 'Profile', value: `${completion}%` },
              ].map(({ label, value }, i) => (
                <div key={label} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid var(--et-border)' : 'none' }}>
                  <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--et-ink)', letterSpacing: '-0.02em' }}>{value}</p>
                  <p style={{ fontSize: '11px', color: 'var(--et-placeholder)', marginTop: 1, fontWeight: 500 }}>{label}</p>
                </div>
              ))}
            </div>
          </ProfileCard>
        </motion.div>

        {/* ── Profile completion nudge ── */}
        <AnimatePresence>
          {missing.length > 0 && (
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
                <p style={{ fontSize: '12px', color: 'var(--et-subtle)', marginTop: 2 }}>
                  Missing: {missing.slice(0, 3).join(', ')}{missing.length > 3 ? ` +${missing.length - 3} more` : ''}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── AI Insights ── */}
        {insights.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionLabel>AI Insights</SectionLabel>
            <ProfileCard style={{ padding: '16px 20px', gap: 12, display: 'flex', flexDirection: 'column' }}>
              <div className="flex items-center gap-2.5" style={{ marginBottom: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L8.5 5.5H13L9.5 8L11 12.5L7 10L3 12.5L4.5 8L1 5.5H5.5L7 1Z" fill="white" fillOpacity="0.9" />
                  </svg>
                </div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--et-ink)' }}>What your AI knows about you</p>
              </div>
              {insights.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  className="flex items-start gap-3"
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                    background: 'var(--et-blue-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="var(--et-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--et-subtle)', lineHeight: 1.5 }}>{insight}</p>
                </motion.div>
              ))}
            </ProfileCard>
          </div>
        )}

        {/* ── Availability ── */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Availability</SectionLabel>
          <ProfileCard style={{ padding: '16px 20px' }}>
            <div className="flex items-center justify-between">
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--et-ink)' }}>
                {availableDays.length > 0
                  ? `${availableDays.length} days per week`
                  : 'Not set'}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--et-muted)' }}>
                Out at {profile.school_end_time}
              </p>
            </div>
            {Object.values(availability).some(Boolean) ? (
              <AvailabilityGrid availability={availability} />
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--et-placeholder)', marginTop: 8 }}>
                Complete onboarding to add your availability
              </p>
            )}
          </ProfileCard>
        </div>

        {/* ── Transportation ── */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Transportation</SectionLabel>
          <ProfileCard style={{ padding: '16px 20px' }}>
            {transports.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--et-placeholder)' }}>Not set</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {transports.map((t, i) => {
                  const opt = TRANSPORTATION_OPTIONS.find((o) => o.value === t)
                  if (!opt) return null
                  return (
                    <div key={t} className="flex items-center gap-3">
                      <span style={{ fontSize: '20px' }}>{opt.emoji}</span>
                      <div className="flex-1">
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--et-ink)' }}>{opt.label}</p>
                        <p style={{ fontSize: '12px', color: 'var(--et-muted)' }}>{opt.rangeLabel}</p>
                      </div>
                      {i === 0 && (
                        <span className="badge badge-blue" style={{ fontSize: '10px', padding: '2px 8px' }}>Primary</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ProfileCard>
        </div>

        {/* ── Career Interests ── */}
        {interests.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Career Interests</SectionLabel>
            <ProfileCard style={{ padding: '16px 20px' }}>
              <div className="flex flex-col gap-2">
                {interests
                  .sort((a, b) => b.weight - a.weight)
                  .map(({ name, weight }) => {
                    const widthPct = weight === 3 ? 100 : weight === 2 ? 66 : 33
                    const weightLabel = weight === 3 ? 'High' : weight === 2 ? 'Medium' : 'Low'
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--et-ink)' }}>{name}</p>
                          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--et-placeholder)' }}>{weightLabel}</p>
                        </div>
                        <div style={{ height: 4, background: 'var(--et-ground)', borderRadius: 4, overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${widthPct}%` }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                            style={{ height: '100%', background: 'linear-gradient(90deg, #2563EB, #7C3AED)', borderRadius: 4 }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </ProfileCard>
          </div>
        )}

        {/* ── Skills ── */}
        {skills.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionLabel>Skills</SectionLabel>
            <ProfileCard style={{ padding: '16px 20px' }}>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="badge badge-subtle" style={{ fontSize: '12px', padding: '5px 12px' }}>{skill}</span>
                ))}
              </div>
            </ProfileCard>
          </div>
        )}

        {/* ── Resume ── */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Resume</SectionLabel>
          {profile.resume_url ? (
            <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <ProfileCard style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--et-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 3H13L17 7V17C17 17.55 16.55 18 16 18H4C3.45 18 3 17.55 3 17V4C3 3.45 3.45 3 4 3H5Z" stroke="var(--et-blue)" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M13 3V7H17" stroke="var(--et-blue)" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M7 11H13M7 14H10" stroke="var(--et-blue)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--et-ink)' }}>Resume uploaded</p>
                  <p style={{ fontSize: '12px', color: 'var(--et-blue)', marginTop: 1 }}>Tap to view →</p>
                </div>
              </ProfileCard>
            </a>
          ) : (
            <ProfileCard style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--et-ground)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 4V14M4 9H14" stroke="var(--et-placeholder)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--et-subtle)' }}>No resume yet</p>
                <p style={{ fontSize: '12px', color: 'var(--et-placeholder)', marginTop: 1 }}>Ask AI Coach to build one for you</p>
              </div>
            </ProfileCard>
          )}
        </div>

        {/* ── Sign out ── */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSignOut}
          style={{
            width: '100%', height: 46, borderRadius: 'var(--radius-full)',
            background: 'none', border: '1.5px solid var(--et-border-mid)',
            fontSize: '14px', fontWeight: 600, color: 'var(--et-muted)',
            cursor: 'pointer', marginTop: 4,
          }}
        >
          Sign out
        </motion.button>

      </div>
    </div>
  )
}
