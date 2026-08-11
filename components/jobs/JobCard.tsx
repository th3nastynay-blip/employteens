'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { recordApplyClick } from '@/lib/apply-tracking'
import { visibleTags } from '@/lib/jobs/quality-score'
import { OrgLogo } from '@/components/ui/OrgLogo'
import type { JobMatch } from '@/lib/types/database'
import type { FitFactor } from '@/lib/ai/match-engine'

interface JobCardProps {
  job: JobMatch
  onSave?: (id: string) => void
  isSaved?: boolean
  index?: number
  /**
   * Computed by the caller, which is the only place the user profile exists.
   * Absent (saved list, tracker) means we simply do not show a fit ring rather
   * than showing a number we cannot justify.
   */
  fit?: FitFactor[]
}


/**
 * FIT RING — segments, not a percentage.
 *
 * This was a continuous arc showing match_score. See fitFactors() in
 * lib/ai/match-engine.ts for why that number was the wrong thing to show: a
 * quarter of it measured the employer rather than the fit, and 91 vs 84 was a
 * distinction no teen could act on.
 *
 * One segment per factor, filled when it passes. The reading is "4 of 5",
 * which is countable off the ring itself without reading the label, and every
 * segment maps to a sentence we can defend.
 */
function FitRing({ factors }: { factors: FitFactor[] }) {
  const size = 52
  const r = 21
  const c = size / 2
  const circ = 2 * Math.PI * r
  const n = factors.length
  const gap = 5
  const seg = circ / n - gap
  const passed = factors.filter((f) => f.ok).length

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="fitgrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop stopColor="var(--et-match-from)" />
            <stop offset="1" stopColor="var(--et-match-to)" />
          </linearGradient>
        </defs>
        {factors.map((f, i) => (
          <motion.circle
            key={f.key}
            cx={c} cy={c} r={r}
            fill="none"
            stroke={f.ok ? 'url(#fitgrad)' : 'var(--et-border-mid)'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${seg} ${circ - seg}`}
            strokeDashoffset={-(i * (circ / n))}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.25 }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="match-gradient-text"
          style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 800, lineHeight: 1 }}
        >
          {passed}
        </span>
        <span style={{ fontSize: '8.5px', color: 'var(--et-placeholder)', fontWeight: 700, lineHeight: 1, marginTop: 1 }}>
          of {n}
        </span>
      </div>
    </div>
  )
}

// Parse match_explanation into reason bullets
// Supports: "• reason1 · reason2" or plain string
function parseReasons(explanation: string): string[] {
  if (!explanation) return []
  // Try to split on '·' separator
  const parts = explanation
    .split('·')
    .map((s) => s.trim().replace(/^[•\-\*]\s*/, '').replace(/\.$/, ''))
    .filter(Boolean)
  return parts.slice(0, 4)
}

export function JobCard({ job, onSave, isSaved, index = 0, fit }: JobCardProps) {
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave?.(job.id)
    setSaving(false)
  }

  const isHumanContact = job.apply_method === 'call' || job.apply_method === 'text' || job.apply_method === 'email'
  const CONTACT_COPY: Record<'call' | 'text' | 'email', { badge: string; button: string }> = {
    // No emoji. They render differently on every Android build and were the
    // loudest thing on a card whose job is to be readable. The button keeps a
    // distinct verb per method, which is the part that actually matters — a
    // teen needs to know they are about to open the phone dialler, not a form.
    call:  { badge: 'Call to apply',  button: 'Call to apply' },
    text:  { badge: 'Text to apply',  button: 'Text to apply' },
    email: { badge: 'Email to apply', button: 'Email to apply' },
  }

  async function handleApply() {
    // Human-contact jobs: apply_url is a synthetic tel:/sms:/mailto: URI (set
    // at ingest time, see smb-phone-ingest.ts) — window.open on it hands off
    // to the OS dialer/Messages/Mail app the same way a plain <a href> would.
    // Nothing else needs to branch here.
    window.open(job.apply_url, '_blank', 'noopener,noreferrer')

    // Do NOT mark as applied — clicking Apply only means they opened the
    // page. The pending click is recorded locally; when the user returns,
    // ApplyConfirmSheet asks "Did you apply?" and only a confirmed Yes
    // writes status='applied'. Analytics still capture the click itself.
    recordApplyClick({
      id: job.id,
      title: job.title,
      company: job.company,
      contactMethod: isHumanContact ? (job.apply_method as 'call' | 'text' | 'email') : undefined,
    })
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('analytics_events').insert({
        user_id: user.id,
        event_type: 'apply_click',
        job_id: job.id,
        metadata: {},
      })
    } catch {
      // Non-critical — don't block the apply action
    }
  }
  const hiresfast = job.hiring_speed_score >= 80
  const reasons = parseReasons(job.match_explanation)
  // Last-resort guard against unit-mismatched salary data reaching a real
  // screen (e.g. an annual figure stored before ingest-pipeline.ts's own
  // sanitizeHourlyWage existed) — this label always says "/hr" with no unit
  // shown, so a bad number here isn't a cosmetic glitch, it's a wrong number
  // in front of a teen. Falls back to "Competitive pay" like missing salary does.
  const plausibleSalary = (n: number | null | undefined) => n != null && n > 0 && n <= 100
  const hasPay = plausibleSalary(job.salary_min) || plausibleSalary(job.salary_max)

  // Trust badges — all computed from real verification/posting data.
  // "now" is captured once on mount (useState initializer) to keep render
  // pure; badge granularity is days, so a stale-by-minutes value is fine.
  const [now] = useState(() => Date.now())
  const verifiedDaysAgo = job.last_verified_at
    ? Math.floor((now - new Date(job.last_verified_at).getTime()) / 86_400_000)
    : null
  const verifiedLabel = verifiedDaysAgo === null
    ? null
    : verifiedDaysAgo <= 0
      ? 'Verified today'
      : verifiedDaysAgo <= 7
        ? 'Verified this week'
        : null
  const isNew = job.posted_at
    ? (now - new Date(job.posted_at).getTime()) / 86_400_000 <= 3
    : false
  const teenFavorite = job.teen_friendly_score >= 90

  // Curated city programs are honestly labeled — they're program pages with
  // an application flow, not single-position postings, so the CTA says what
  // actually happens ("Learn & apply"), and a City program badge marks them.
  // Did anyone other than our own legal table set this age? An employer age
  // is only ever populated when the posting states one or a trusted source
  // declared it — see resolveAllAgeFacts. Null means "we never checked", and
  // that is a different claim from "they accept 14".
  const employerAgeKnown =
    typeof job.employer_min_age === 'number' ||
    // At or above 16 the two rarely disagree and the claim is uncontroversial;
    // the risk is specifically in asserting a BELOW-16 employer policy we do
    // not have. Keeps 339 ordinary 16+ listings from all going grey.
    (typeof job.min_age === 'number' && job.min_age >= 16)

  const isProgram = job.source === 'local' &&
    (job.job_type === 'program' || job.job_type === 'volunteer' || job.job_type === 'seasonal')
  // Age tags are redundant with the dedicated "Ages N+" badge below
  const structuredTags = visibleTags(job.tags).filter((t) => !/^ages\s/i.test(t)).slice(0, 4)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 }}
      className="card-elevated overflow-hidden flex flex-col"
    >
      {/* ── Header ──
          LOGO LEADS, ring follows. The old layout gave the whole leading slot
          to a 72px match ring, so every card in the feed opened with a number
          and the employer was a grey line of text underneath. A teen scanning
          a list recognises "Chipotle" long before they read "91%", and the
          Explore cards already lead with the organisation — this is what made
          the two halves of the app look like different products.

          Badges are .pill now, not .badge, and the emoji are gone. Emoji
          render differently on every Android build and were the loudest thing
          on a card whose actual job is to be readable. */}
      <div
        className="px-5 pt-5 pb-4 flex items-start gap-3.5"
        style={{ borderBottom: '1px solid var(--et-border)' }}
      >
        <OrgLogo src={job.logo_url as string | null} name={job.company} size={48} radius={13} />

        <div className="flex-1 min-w-0">
          <h3 className="display" style={{ fontSize: '17px', lineHeight: 1.22 }}>
            {job.title}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: 2, fontWeight: 500 }}>
            {job.company}
          </p>

          <div className="flex items-center gap-1.5 flex-wrap" style={{ marginTop: 8 }}>
            {fit && fit.length > 0 && (
              <span className={fit.every((f) => f.ok) ? 'pill pill-green' : 'pill pill-blue'}>
                {fit.filter((f) => f.ok).length} of {fit.length} fit
              </span>
            )}
            {isProgram && <span className="pill pill-blue">City program</span>}
            {isHumanContact && (
              <span className="pill pill-blue">
                {CONTACT_COPY[job.apply_method as 'call' | 'text' | 'email'].badge}
              </span>
            )}
            {isNew && !isProgram && <span className="pill">New</span>}
            {hiresfast && <span className="pill pill-amber">Hires fast</span>}
          </div>
        </div>

        {fit && fit.length > 0 && <FitRing factors={fit} />}
      </div>

      {/* ── Why this matches you ── */}
      <div
        className="px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--et-border)' }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <div className="flex items-center justify-between">
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--et-placeholder)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {fit && fit.length > 0 ? 'How it fits you' : 'Why this matches you'}
            </p>
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                color: 'var(--et-placeholder)',
              }}
            >
              <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {/* THE FAILED FACTORS COME FIRST.
            The old block listed only positives — every card was a row of green
            ticks agreeing with itself. The single most useful line on a job
            card is the one thing that does NOT line up, because that is what a
            teen has to decide about. Passing factors collapse behind the
            expander; the mismatch does not. */}
        {fit && fit.length > 0 ? (
          <div className="flex flex-col gap-1.5 mt-2">
            {[...fit].sort((a, b) => Number(a.ok) - Number(b.ok))
              .slice(0, expanded ? fit.length : Math.max(2, fit.filter((f) => !f.ok).length))
              .map((f) => (
                <div key={f.key} className="flex items-start gap-2">
                  {f.ok ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="6.5" fill="var(--et-green-light)" />
                      <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="var(--et-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
                      <circle cx="7" cy="7" r="6.5" fill="var(--et-surface-2)" />
                      <path d="M7 4v4M7 10h.01" stroke="var(--et-placeholder)" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  )}
                  <span style={{ fontSize: '13px', color: f.ok ? 'var(--et-subtle)' : 'var(--et-ink)', lineHeight: 1.4 }}>
                    <strong style={{ fontWeight: f.ok ? 500 : 700 }}>{f.label}</strong>
                    {!f.ok && f.note ? ` — ${f.note}` : ''}
                  </span>
                </div>
              ))}
          </div>
        ) : (
        <div className="flex flex-col gap-1.5 mt-2">
          {(expanded ? reasons : reasons.slice(0, 2)).map((reason, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6.5" fill="var(--et-green-light)" />
                <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="var(--et-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: '13px', color: 'var(--et-subtle)', lineHeight: 1.4 }}>{reason}</span>
            </motion.div>
          ))}
        </div>
        )}

        <AnimatePresence>
          {!expanded && reasons.length > 2 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setExpanded(true)}
              style={{
                background: 'none', border: 'none', padding: '4px 0 0',
                fontSize: '12px', color: 'var(--et-blue)', fontWeight: 600, cursor: 'pointer',
              }}
            >
              +{reasons.length - 2} more reasons
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Logistics + actions ── */}
      <div className="px-5 pt-3.5 pb-4 flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-2">
          {/* Order matters. Pay and age come first because they are the two
              facts that decide whether a teen can act on this at all; the
              texture tags come last. Previously "verified" led, which is our
              concern, not theirs. */}
          {hasPay ? (
            <span className="pill pill-green">
              ${plausibleSalary(job.salary_min) ? job.salary_min : job.salary_max}/hr
            </span>
          ) : (
            <span className="pill">Pay not listed</span>
          )}
          {/* THE AGE CLAIM — read this before changing it.
              This said "Ages 14+" in green, which reads as a fact about the
              EMPLOYER. It is not. resolveAllAgeFacts computes
                effective = max(legal, hours, employer ?? 0, brandFloor)
              so when we have no employer policy, `employer ?? 0` contributes
              nothing and effective silently collapses to what the LAW allows.

              For Eataly that produced "Ages 14+" from the reason string
              "NY permits at 14: supermarket and food store; employer policy
              unknown". We had never checked whether Eataly hires 14-year-olds.
              Telling a 14-year-old they qualify, in green, on our say-so, is
              exactly the failure the legal/employer split exists to prevent.

              So: green only when the employer's own posting stated an age, or
              a trusted source declared one. Otherwise muted, and the label
              says whose rule it is. */}
          {employerAgeKnown ? (
            <span className="pill pill-green">Ages {job.min_age}+</span>
          ) : (
            <span
              className="pill pill-muted"
              title="This is the legal minimum for this kind of work in your state. We have not confirmed the employer's own policy."
            >
              {job.min_age}+ by law · employer unconfirmed
            </span>
          )}
          {job.distance_miles !== undefined && (
            <span className="pill">
              {job.distance_miles < 1 ? 'Under 1 mi' : `${job.distance_miles.toFixed(1)} mi`}
            </span>
          )}
          {job.experience_required === 'none' && (
            <span className="pill pill-blue">No experience needed</span>
          )}
          {verifiedLabel && (
            <span className="pill pill-muted" title="We re-check every listing's application link automatically">
              {verifiedLabel}
            </span>
          )}
          {structuredTags.map((t) => (
            <span key={t} className="pill">{t}</span>
          ))}
          {teenFavorite && <span className="pill">Teen favourite</span>}
        </div>

        <p style={{ fontSize: '12px', color: 'var(--et-placeholder)' }}>{job.location}</p>

        {isHumanContact && job.contact_note && (
          <p style={{ fontSize: '12px', color: 'var(--et-subtle)', lineHeight: 1.4, background: 'var(--et-blue-light)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
            <strong>{job.apply_method === 'email' ? job.contact_email : job.contact_phone}</strong>
            {job.contact_note ? ` · ${job.contact_note}` : ''}
          </p>
        )}

        <div className="flex gap-2.5">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleSave}
            disabled={saving}
            style={{
              height: 48, width: 52, borderRadius: 14, flexShrink: 0,
              border: isSaved ? '1.5px solid rgba(37,99,235,0.3)' : '1.5px solid var(--et-border-mid)',
              background: isSaved ? 'var(--et-blue-light)' : 'var(--et-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M4 3H14C14.55 3 15 3.45 15 4V15.5L9 12.8L3 15.5V4C3 3.45 3.45 3 4 3Z"
                fill={isSaved ? 'var(--et-blue)' : 'none'}
                stroke={isSaved ? 'var(--et-blue)' : 'var(--et-muted)'}
                strokeWidth="1.5" strokeLinejoin="round"
              />
            </svg>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleApply}
            className="flex-1"
            style={{
              height: 48, borderRadius: 14, border: 'none',
              // Same gradient as the Explore sheet's Apply. One primary action,
              // one appearance, everywhere in the app.
              background: 'linear-gradient(135deg, var(--et-match-from), var(--et-match-to))',
              color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '15px', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,0.26)',
            }}
          >
            {isHumanContact
              ? CONTACT_COPY[job.apply_method as 'call' | 'text' | 'email'].button
              : isProgram ? 'Learn & apply' : 'Apply now'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
