'use client'

/**
 * EMPLOYTEENS — profile
 *
 * Rebuilt against the Appybara profile reference. Three structural moves came
 * from it and one large deletion did not.
 *
 * 1. SECTIONS GET A HEAD, NOT A LABEL. Every section here used to open with
 *    11px grey uppercase text, so the page read as one long form and nothing
 *    stood out from anything else. Icon plus a display-weight heading, per
 *    components/profile/Section.tsx.
 *
 * 2. EMPTY SECTIONS ARE BUTTONS, NOT ABSENCES. The old page hid a section when
 *    it had no data, or printed "Not set". A new teen therefore saw a four-item
 *    profile with no indication that skills, resume or transport existed at
 *    all — we were hiding the work from the person who has to do it. Now every
 *    section always renders, and an empty one is a dashed tile the same size as
 *    the filled version, saying what they get out of filling it.
 *
 * 3. THE LADDER IS THE SPINE. Appybara's equivalent slot is "How strong is your
 *    profile?" leading to a Chance Me score. We cannot and should not rank a
 *    15-year-old in Bayonne against other applicants, but we CAN say exactly
 *    what is on their record and what the next rung needs. See LadderStrip.
 *
 * THE DELETION. "What your AI knows about you" generated up to four sentences
 * from the teen's own onboarding answers and presented them back as insight:
 * "Public transit access increases your eligible job radius by up to 10 miles",
 * "Multiple transport options give you the widest job reach of any profile
 * type". Both numbers were invented — no code computes a 10-mile transit bonus
 * or ranks "profile types" by reach. It restated inputs as analysis and made up
 * statistics to do it, in a product used by minors. Gone, along with
 * generateInsights(). The honest version of that block is the ladder, which
 * only ever states things we hold evidence for and labels self-report as
 * self-report.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  deserializeTransportation,
  deserializeInterests,
  TRANSPORTATION_OPTIONS,
  GRADE_LABELS,
  type WeightedInterest,
} from '@/lib/types/onboarding'
import type { UserProfile } from '@/lib/types/database'
import { detectRung, type LadderEvent, type Rung } from '@/lib/rungs'
import { ProfileHeader, type ProfileStep } from '@/components/profile/ProfileHeader'
import { ReferenceCard, type ReferenceState } from '@/components/profile/ReferenceCard'
import { LadderStrip } from '@/components/profile/LadderStrip'
import { SectionHead, AddTile, Panel } from '@/components/profile/Section'

const DAYS = [
  { key: 'monday', short: 'M' },
  { key: 'tuesday', short: 'T' },
  { key: 'wednesday', short: 'W' },
  { key: 'thursday', short: 'T' },
  { key: 'friday', short: 'F' },
  { key: 'saturday', short: 'S' },
  { key: 'sunday', short: 'S' },
]

function AvailabilityGrid({ availability }: { availability: Record<string, boolean> }) {
  return (
    <div className="flex gap-2" style={{ marginTop: 12 }}>
      {DAYS.map(({ key, short }, i) => {
        const on = availability[key]
        return (
          <div key={key} className="flex flex-col items-center gap-1.5 flex-1">
            <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--et-placeholder)' }}>{short}</p>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.03 * i, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: '100%', height: 30, borderRadius: 9,
                background: on ? 'linear-gradient(180deg, var(--et-match-from), var(--et-match-to))' : 'var(--et-ground)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {on && (
                <svg width="11" height="9" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedCount, setSavedCount] = useState(0)
  const [appliedCount, setAppliedCount] = useState(0)
  const [events, setEvents] = useState<LadderEvent[]>([])

  const load = useCallback(async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    try {
      const [{ data: profileData }, { data: apps }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        // Full rows, not counts. The ladder needs outcomes and response dates,
        // and fetching them here means one round trip instead of three.
        supabase
          .from('applications')
          .select('status, applied_at, outcome, first_response_at, jobs (kind, evidence_kind)')
          .eq('user_id', user.id),
      ])

      if (profileData) setProfile(profileData as unknown as UserProfile)

      type Raw = {
        status: LadderEvent['status']
        applied_at: string | null
        outcome: LadderEvent['outcome']
        first_response_at: string | null
        jobs: { kind: string | null; evidence_kind: string | null } | null
      }
      const rows = (apps ?? []) as unknown as Raw[]

      setEvents(rows.map((a) => ({
        kind: a.jobs?.kind ?? 'job',
        status: a.status,
        applied_at: a.applied_at,
        outcome: a.outcome,
        first_response_at: a.first_response_at,
        evidence_kind: a.jobs?.evidence_kind ?? null,
      })))
      setSavedCount(rows.filter((a) => a.status === 'saved').length)
      setAppliedCount(rows.filter((a) => a.status !== 'saved').length)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const reload = useCallback(() => { void load() }, [load])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const toOnboarding = useCallback(() => router.push('/onboarding'), [router])

  if (loading) {
    return (
      <div className="px-5 pt-safe-header flex flex-col gap-4">
        {[80, 200, 120, 160, 100].map((h, i) => (
          <div key={i} className="skeleton" style={{ height: h, borderRadius: 'var(--radius-xl)' }} />
        ))}
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="px-5 flex flex-col items-center gap-5" style={{ paddingTop: 80 }}>
        <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--et-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>👤</div>
        <div style={{ textAlign: 'center' }}>
          <h2 className="display display-lg">Nothing here yet</h2>
          <p style={{ fontSize: '14px', color: 'var(--et-muted)', marginTop: 6, lineHeight: 1.5 }}>
            Answer a few questions and we can start matching you.
          </p>
        </div>
        <a href="/onboarding"><button className="btn-primary" style={{ borderRadius: 'var(--radius-full)' }}>Get started</button></a>
        <button onClick={handleSignOut} style={{ background: 'none', border: 'none', fontSize: '14px', color: 'var(--et-muted)', cursor: 'pointer', fontWeight: 500 }}>Sign out</button>
      </div>
    )
  }

  const transports = deserializeTransportation(profile.transportation as string)
  const interests: WeightedInterest[] = deserializeInterests(profile.interests)
  const skills = (profile.skills as string[]) ?? []
  const availability = (profile.availability as Record<string, boolean>) ?? {}
  const gradeLabel = GRADE_LABELS[profile.school_grade as keyof typeof GRADE_LABELS] ?? profile.school_grade
  const availableDays = Object.entries(availability).filter(([, v]) => v).map(([k]) => k)
  const primaryTransport = transports[0]

  const p = profile as unknown as Record<string, unknown>
  const referenceState: ReferenceState = {
    name: (p.reference_name as string | null) ?? null,
    role: (p.reference_role as string | null) ?? null,
    org: (p.reference_org as string | null) ?? null,
    confirmedAt: (p.reference_confirmed_at as string | null) ?? null,
    confirmedBy: (p.reference_confirmed_by as string | null) ?? null,
    declinedAt: (p.reference_declined_at as string | null) ?? null,
    token: (p.reference_token as string | null) ?? null,
  }

  const ladder = detectRung({
    age: (profile.age as number) ?? null,
    hasWorkingPapers: (p.has_working_papers as boolean | null) ?? null,
    events,
    reference: referenceState.name
      ? {
          name: referenceState.name,
          role: referenceState.role ?? '',
          org: referenceState.org ?? undefined,
          confirmedAt: referenceState.confirmedAt,
        }
      : null,
  })

  const attributes = [
    profile.age ? `Age ${profile.age}` : null,
    gradeLabel ? String(gradeLabel) : null,
    profile.state ? `${profile.state} ${profile.zip_code ?? ''}`.trim() : null,
    primaryTransport ? TRANSPORTATION_OPTIONS.find((t) => t.value === primaryTransport)?.label ?? null : null,
    availableDays.length > 0 ? `${availableDays.length} days free` : null,
  ].filter((x): x is string => Boolean(x))

  const steps: ProfileStep[] = [
    { id: 'basics', label: 'Basics', done: Boolean(profile.name && profile.age) },
    { id: 'location', label: 'Location', done: Boolean(profile.zip_code) },
    { id: 'school', label: 'School', done: Boolean(profile.school_grade) },
    { id: 'availability', label: 'Availability', done: availableDays.length > 0 },
    { id: 'transport', label: 'Transport', done: transports.length > 0 },
    { id: 'interests', label: 'Interests', done: interests.length > 0 },
    { id: 'skills', label: 'Skills', done: skills.length > 0 },
    { id: 'resume', label: 'Resume', done: Boolean(profile.resume_url) },
    // Naming someone is asking, not having.
    { id: 'reference', label: 'Reference', done: Boolean(referenceState.confirmedAt) },
  ]

  return (
    <div className="flex flex-col pb-nav">
      <div className="pt-safe-header pb-2">
        <ProfileHeader
          name={profile.name}
          attributes={attributes}
          steps={steps}
          savedCount={savedCount}
          appliedCount={appliedCount}
          onStep={toOnboarding}
        />
      </div>

      <div className="px-4 flex flex-col" style={{ gap: 22, marginTop: 18 }}>

        {/* ── The climb ── */}
        <LadderStrip
          rung={ladder.rung as Rung}
          confidence={ladder.confidence}
          vouchedBy={referenceState.confirmedAt ? referenceState.name : null}
        />

        {/* ── Reference ──
            High on the page because it is the only claim here that somebody
            other than the teen can confirm. It outranks everything below it. */}
        <ReferenceCard reference={referenceState} onSaved={reload} />

        {/* ── Availability ── */}
        <div>
          <SectionHead icon="clock" title="When you're free" action="Edit" onAction={toOnboarding} />
          {availableDays.length > 0 ? (
            <Panel>
              <div className="flex items-baseline justify-between">
                <p className="display" style={{ fontSize: '15px' }}>
                  {availableDays.length} {availableDays.length === 1 ? 'day' : 'days'} a week
                </p>
                {profile.school_end_time && (
                  <p style={{ fontSize: '12px', color: 'var(--et-muted)' }}>
                    Out at {String(profile.school_end_time)}
                  </p>
                )}
              </div>
              <AvailabilityGrid availability={availability} />
            </Panel>
          ) : (
            <AddTile
              label="Add the days you can work"
              hint="The first thing a manager asks, and it decides most of your feed."
              onClick={toOnboarding}
            />
          )}
        </div>

        {/* ── Transport ── */}
        <div>
          <SectionHead icon="route" title="Getting there" action="Edit" onAction={toOnboarding} />
          {transports.length > 0 ? (
            <Panel>
              <div className="flex flex-col gap-3">
                {transports.map((t, i) => {
                  const opt = TRANSPORTATION_OPTIONS.find((o) => o.value === t)
                  if (!opt) return null
                  return (
                    <div key={t} className="flex items-center gap-3">
                      <span style={{ fontSize: '20px', width: 24, textAlign: 'center' }}>{opt.emoji}</span>
                      <div className="flex-1" style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--et-ink)' }}>{opt.label}</p>
                        <p style={{ fontSize: '12px', color: 'var(--et-muted)', marginTop: 1 }}>{opt.rangeLabel}</p>
                      </div>
                      {i === 0 && <span className="pill pill-blue">Main</span>}
                    </div>
                  )
                })}
              </div>
            </Panel>
          ) : (
            <AddTile
              label="Add how you get around"
              hint="Sets how far we look. Without it we can only show you walking distance."
              onClick={toOnboarding}
            />
          )}
        </div>

        {/* ── Interests ── */}
        <div>
          <SectionHead icon="compass" title="What you're into" action="Edit" onAction={toOnboarding} />
          {interests.length > 0 ? (
            <Panel>
              <div className="flex flex-col gap-2.5">
                {[...interests].sort((a, b) => b.weight - a.weight).map(({ name, weight }, i) => (
                  <div key={name}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
                      <p style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--et-ink)' }}>{name}</p>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--et-placeholder)' }}>
                        {weight === 3 ? 'A lot' : weight === 2 ? 'Some' : 'A bit'}
                      </p>
                    </div>
                    <div style={{ height: 5, background: 'var(--et-ground)', borderRadius: 4, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${weight === 3 ? 100 : weight === 2 ? 66 : 33}%` }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.08 * i }}
                        style={{ height: '100%', background: 'linear-gradient(90deg, var(--et-match-from), var(--et-match-to))', borderRadius: 4 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ) : (
            <AddTile
              label="Pick what you're interested in"
              hint="Moves the jobs you'd actually enjoy to the top of the feed."
              onClick={toOnboarding}
            />
          )}
        </div>

        {/* ── Skills ── */}
        <div>
          <SectionHead icon="spark" title="What you can do" action="Edit" onAction={toOnboarding} />
          {skills.length > 0 ? (
            <Panel>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="pill">{s}</span>
                ))}
              </div>
            </Panel>
          ) : (
            <AddTile
              label="Add a few things you're good at"
              hint="Counts even if you learned it at home. Most teens undersell this one."
              onClick={toOnboarding}
            />
          )}
        </div>

        {/* ── Resume ──
            Points at /resume, which builds one from data we already hold,
            rather than at a file upload that never worked. The old link went
            to users.resume_url — a Supabase getPublicUrl() that answers 400,
            so "Resume uploaded, tap to view" was dead for everyone. */}
        <div>
          <SectionHead icon="doc" title="Resume" />
          <button
            onClick={() => router.push('/resume')}
            className="press"
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: 'var(--et-surface)', border: '1px solid var(--et-border)',
              borderRadius: 18, padding: '15px 16px',
              display: 'flex', alignItems: 'center', gap: 13,
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--et-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--et-blue)" aria-hidden="true">
                <path d="M5 2.6h5l3.6 3.6v9.2H5Z" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M10 2.6v3.6h3.6" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--et-ink)' }}>
                Open your resume
              </p>
              <p style={{ fontSize: '12px', color: 'var(--et-muted)', marginTop: 2, lineHeight: 1.45 }}>
                Already started from your profile. Edit it, save it as a PDF, or paste it
                into an application.
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
              <path d="M6 3.5L10.5 8L6 12.5" stroke="var(--et-placeholder)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* ── Account ── */}
        <div>
          <SectionHead icon="shield" title="Account" />
          <div className="flex flex-col gap-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSignOut}
              style={{
                width: '100%', height: 46, borderRadius: 14,
                background: 'var(--et-surface)', border: '1px solid var(--et-border-mid)',
                fontSize: '14px', fontWeight: 600, color: 'var(--et-subtle)', cursor: 'pointer',
              }}
            >
              Sign out
            </motion.button>
            <DeleteAccountSection />
          </div>
        </div>

        <div className="flex justify-center gap-4" style={{ paddingBottom: 8 }}>
          <a href="/privacy" style={{ fontSize: '11px', color: 'var(--et-placeholder)' }}>Privacy</a>
          <a href="/terms" style={{ fontSize: '11px', color: 'var(--et-placeholder)' }}>Terms</a>
          <a href="/support" style={{ fontSize: '11px', color: 'var(--et-placeholder)' }}>Support</a>
        </div>

      </div>
    </div>
  )
}

function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? 'Something went wrong — try again or email support.')
        setDeleting(false)
        return
      }
      const supabase = createClient()
      await supabase.auth.signOut().catch(() => { /* session already invalid */ })
      window.location.href = '/'
    } catch {
      setError('Something went wrong — try again or email support.')
      setDeleting(false)
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        style={{
          width: '100%', padding: '10px 0', background: 'none',
          border: 'none', fontSize: '12px', color: 'var(--et-placeholder)',
          cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        Delete account
      </button>
    )
  }

  return (
    <div
      style={{
        borderRadius: 18, padding: '15px 16px',
        border: '1px solid rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.03)',
      }}
    >
      <p style={{ fontSize: '14px', fontWeight: 700, color: '#B91C1C' }}>Delete your account?</p>
      <p style={{ fontSize: '13px', color: 'var(--et-subtle)', marginTop: 4, lineHeight: 1.5 }}>
        This permanently removes your profile, saved jobs, applications, and all data — immediately
        and irreversibly.
      </p>
      {error && <p style={{ fontSize: '12px', color: '#B91C1C', marginTop: 6 }}>{error}</p>}
      <div className="flex gap-2" style={{ marginTop: 12 }}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            flex: 1, height: 42, borderRadius: 12, border: 'none',
            background: '#DC2626', color: 'white', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', opacity: deleting ? 0.6 : 1,
          }}
        >
          {deleting ? 'Deleting…' : 'Yes, delete everything'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          style={{
            flex: 1, height: 42, borderRadius: 12,
            border: '1px solid var(--et-border-mid)', background: 'var(--et-surface)',
            color: 'var(--et-subtle)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Keep my account
        </button>
      </div>
    </div>
  )
}
