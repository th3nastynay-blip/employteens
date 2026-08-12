'use client'

/**
 * EMPLOYTEENS — the resume
 *
 * NO PDF LIBRARY, DELIBERATELY. The export is the browser's own print-to-PDF,
 * driven by a print stylesheet. Reasons, in order of how much they mattered:
 *
 *   1. It works on a phone. iOS Safari and Android Chrome both print to PDF
 *      natively and both let you save or share the result. Nearly every teen
 *      here is on a phone.
 *   2. Fonts and layout come out identical to what is on screen, because it IS
 *      what is on screen. Server-rendered PDFs drift from the preview and the
 *      user finds out after sending it to an employer.
 *   3. jsPDF or a headless-Chrome route is 200KB of client bundle or a
 *      serverless function with a Chromium binary, to reproduce something the
 *      browser already does properly.
 *
 * EDITING IS INLINE, NOT A FORM. A separate edit form means the teen fills
 * fields blind and finds out what it looks like afterwards. Here the page is
 * the document and the fields are in it, so the thing being typed into is the
 * thing that prints.
 *
 * NOTHING HERE INVENTS EXPERIENCE. The seed only uses what the teen entered or
 * what an adult confirmed. See lib/resume/types.ts.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types/database'
import {
  seedResume, toPlainText, newId, EMPTY_RESUME,
  type ResumeData, type ResumeReference,
} from '@/lib/resume/types'
import { loadResume, saveResume } from '@/lib/resume/store'

type Saving = 'idle' | 'saving' | 'saved' | 'error'

export default function ResumePage() {
  const router = useRouter()
  const [resume, setResume] = useState<ResumeData>(EMPTY_RESUME)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Saving>('idle')
  const [copied, setCopied] = useState(false)
  const dirty = useRef(false)

  useEffect(() => {
    void (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: profileRow }, stored] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        loadResume(),
      ])

      const p = (profileRow ?? {}) as unknown as Record<string, unknown>
      const reference: ResumeReference | null = p.reference_name
        ? {
            name: String(p.reference_name),
            role: String(p.reference_role ?? ''),
            org: String(p.reference_org ?? ''),
            confirmed: Boolean(p.reference_confirmed_at),
          }
        : null

      setResume(seedResume((profileRow ?? {}) as unknown as UserProfile, reference, stored))
      setLoading(false)
    })()
  }, [])

  // Debounced autosave. A teen editing on a phone will close the tab without
  // ever looking for a save button, so there isn't one.
  useEffect(() => {
    if (loading || !dirty.current) return
    setSaving('saving')
    const t = setTimeout(async () => {
      const ok = await saveResume(resume)
      setSaving(ok ? 'saved' : 'error')
      setTimeout(() => setSaving('idle'), 1800)
    }, 900)
    return () => clearTimeout(t)
  }, [resume, loading])

  const edit = useCallback((patch: Partial<ResumeData>) => {
    dirty.current = true
    setResume((r) => ({ ...r, ...patch }))
  }, [])

  async function copyText() {
    try {
      await navigator.clipboard.writeText(toPlainText(resume))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  if (loading) {
    return (
      <div className="px-5 pt-safe-header flex flex-col gap-3">
        {[70, 140, 180, 120].map((h, i) => (
          <div key={i} className="skeleton" style={{ height: h, borderRadius: 16 }} />
        ))}
      </div>
    )
  }

  return (
    <div className="pb-nav">
      {/* Print rules. `.no-print` covers all the app chrome; the sheet itself
          drops its rounded corners and shadow so it prints as a document
          rather than a screenshot of a card. */}
      <style>{`
        @media print {
          .no-print, .bottom-nav { display: none !important; }
          body { background: #fff !important; }
          .resume-sheet {
            border: none !important; box-shadow: none !important;
            border-radius: 0 !important; margin: 0 !important; padding: 0 !important;
            max-width: none !important;
          }
          .field { border: none !important; background: none !important; padding: 0 !important; }
          @page { margin: 14mm; }
        }
      `}</style>

      <div className="no-print pt-safe-header px-4" style={{ paddingBottom: 10 }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="press"
            style={{
              width: 34, height: 34, borderRadius: 11, flexShrink: 0, cursor: 'pointer',
              background: 'var(--et-surface)', border: '1px solid var(--et-border-mid)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3.5L5.5 8l4.5 4.5" stroke="var(--et-subtle)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="display" style={{ fontSize: '17px' }}>Your resume</h1>
            <p style={{ fontSize: '11px', color: saving === 'error' ? 'var(--et-red)' : 'var(--et-placeholder)', marginTop: 2 }}>
              {saving === 'saving' ? 'Saving…'
                : saving === 'saved' ? 'Saved'
                : saving === 'error' ? 'Could not save — check your connection'
                : 'Saves as you type'}
            </p>
          </div>
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--et-muted)', lineHeight: 1.55, marginTop: 12 }}>
          Started from what you already told us. Tap anything to change it. Nothing here
          was invented — if a line is not true, delete it.
        </p>

        <div className="flex gap-2" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={() => window.print()} className="press" style={primaryBtn}>
            Save as PDF
          </button>
          <button onClick={copyText} className="press" style={secondaryBtn}>
            {copied ? 'Copied' : 'Copy as text'}
          </button>
          <button
            onClick={() => router.push('/career?ask=' + encodeURIComponent(
              'Here is my resume. Tell me what is weak about it and rewrite the parts that need it:\n\n' + toPlainText(resume),
            ))}
            className="press"
            style={secondaryBtn}
          >
            Ask the coach
          </button>
        </div>
      </div>

      {/* ── The sheet ── */}
      <div className="px-4">
        <div
          className="resume-sheet"
          style={{
            background: 'var(--et-surface)', border: '1px solid var(--et-border)',
            borderRadius: 18, padding: 20, maxWidth: 620, margin: '0 auto',
          }}
        >
          <Field
            value={resume.fullName}
            onChange={(v) => edit({ fullName: v })}
            placeholder="Your full name"
            style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}
          />
          <div className="flex flex-wrap" style={{ gap: 6, marginTop: 4 }}>
            <Field value={resume.email} onChange={(v) => edit({ email: v })} placeholder="Email" small />
            <Field value={resume.phone} onChange={(v) => edit({ phone: v })} placeholder="Phone" small />
            <Field value={resume.location} onChange={(v) => edit({ location: v })} placeholder="Town, State" small />
          </div>

          <Rule />
          <Field
            value={resume.summary}
            onChange={(v) => edit({ summary: v })}
            placeholder="One or two lines about you"
            multiline
            style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--et-subtle)' }}
          />

          <Section title="Education" />
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            <Field value={resume.school} onChange={(v) => edit({ school: v })} placeholder="School name" />
            <Field value={resume.grade} onChange={(v) => edit({ grade: v })} placeholder="Grade" small />
            <Field value={resume.gradYear} onChange={(v) => edit({ gradYear: v })} placeholder="Grad year" small />
          </div>

          <Section
            title="Experience"
            action="Add"
            onAction={() => edit({
              experience: [...resume.experience, { id: newId(), title: '', org: '', when: '', bullets: [''] }],
            })}
          />
          {resume.experience.length === 0 && (
            <Hint>
              Counts more than you think: babysitting, dog walking, helping in a family
              shop, running a school club. Paid or not.
            </Hint>
          )}
          {resume.experience.map((e, i) => (
            <div key={e.id} style={{ marginBottom: 12 }}>
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                <Field
                  value={e.title}
                  onChange={(v) => edit({ experience: resume.experience.map((x, j) => j === i ? { ...x, title: v } : x) })}
                  placeholder="What you did"
                  style={{ fontWeight: 700 }}
                />
                <Field
                  value={e.org}
                  onChange={(v) => edit({ experience: resume.experience.map((x, j) => j === i ? { ...x, org: v } : x) })}
                  placeholder="Where"
                  small
                />
                <Field
                  value={e.when}
                  onChange={(v) => edit({ experience: resume.experience.map((x, j) => j === i ? { ...x, when: v } : x) })}
                  placeholder="When"
                  small
                />
              </div>
              {e.bullets.map((b, bi) => (
                <div key={bi} className="flex items-start" style={{ gap: 6, marginTop: 4 }}>
                  <span style={{ color: 'var(--et-placeholder)', fontSize: '13px', marginTop: 6 }}>•</span>
                  <Field
                    value={b}
                    onChange={(v) => edit({
                      experience: resume.experience.map((x, j) =>
                        j === i ? { ...x, bullets: x.bullets.map((y, k) => (k === bi ? v : y)) } : x),
                    })}
                    placeholder="Something you actually did"
                    multiline
                    style={{ fontSize: '13px', lineHeight: 1.55 }}
                  />
                </div>
              ))}
              <div className="no-print flex" style={{ gap: 10, marginTop: 4 }}>
                <MiniBtn onClick={() => edit({
                  experience: resume.experience.map((x, j) => j === i ? { ...x, bullets: [...x.bullets, ''] } : x),
                })}>
                  Add a line
                </MiniBtn>
                <MiniBtn danger onClick={() => edit({ experience: resume.experience.filter((_, j) => j !== i) })}>
                  Remove
                </MiniBtn>
              </div>
            </div>
          ))}

          <Section
            title="Activities"
            action="Add"
            onAction={() => edit({ activities: [...resume.activities, { id: newId(), title: '', org: '', note: '' }] })}
          />
          {resume.activities.map((a, i) => (
            <div key={a.id} style={{ marginBottom: 10 }}>
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                <Field
                  value={a.title}
                  onChange={(v) => edit({ activities: resume.activities.map((x, j) => j === i ? { ...x, title: v } : x) })}
                  placeholder="Club, team, volunteering"
                  style={{ fontWeight: 700 }}
                />
                <Field
                  value={a.org}
                  onChange={(v) => edit({ activities: resume.activities.map((x, j) => j === i ? { ...x, org: v } : x) })}
                  placeholder="Where"
                  small
                />
              </div>
              <Field
                value={a.note}
                onChange={(v) => edit({ activities: resume.activities.map((x, j) => j === i ? { ...x, note: v } : x) })}
                placeholder="What you did there"
                multiline
                style={{ fontSize: '13px', lineHeight: 1.55 }}
              />
              <div className="no-print" style={{ marginTop: 2 }}>
                <MiniBtn danger onClick={() => edit({ activities: resume.activities.filter((_, j) => j !== i) })}>
                  Remove
                </MiniBtn>
              </div>
            </div>
          ))}

          <Section title="Skills" />
          <Field
            value={resume.skills.join(', ')}
            onChange={(v) => edit({ skills: v.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="Separate with commas"
            multiline
            style={{ fontSize: '13px', lineHeight: 1.55 }}
          />

          <Section title="Availability" />
          <Field
            value={resume.availability}
            onChange={(v) => edit({ availability: v })}
            placeholder="When you can work"
            style={{ fontSize: '13px' }}
          />

          {/* Reference is read-only and comes from the confirmed record, never
              from stored resume data. It is the one line an employer might
              actually ring up, so a stale copy here could claim a vouch that
              was withdrawn. */}
          {resume.reference && (
            <>
              <Section title="Reference" />
              <p style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--et-ink)' }}>
                {[resume.reference.name, resume.reference.role, resume.reference.org].filter(Boolean).join(', ')}
                {resume.reference.confirmed && (
                  <span style={{ color: 'var(--et-green)', fontWeight: 600 }}> · confirmed</span>
                )}
              </p>
              {!resume.reference.confirmed && (
                <p className="no-print" style={{ fontSize: '11.5px', color: 'var(--et-muted)', marginTop: 4, lineHeight: 1.5 }}>
                  They have not confirmed yet. Until they do, leave them off anything you
                  send an employer.
                </p>
              )}
            </>
          )}

          {!resume.reference && (
            <div className="no-print" style={{ marginTop: 18 }}>
              <Hint>
                The strongest line on a teen resume is an adult who will vouch for you.
                Add one from your profile and it appears here automatically.
              </Hint>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Bits ────────────────────────────────────────────────────────────── */

const primaryBtn: React.CSSProperties = {
  height: 40, padding: '0 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
  background: 'var(--et-ink)', color: '#fff',
  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13.5px',
}
const secondaryBtn: React.CSSProperties = {
  height: 40, padding: '0 16px', borderRadius: 12, cursor: 'pointer',
  background: 'var(--et-surface)', border: '1px solid var(--et-border-mid)',
  color: 'var(--et-subtle)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13.5px',
}

function Rule() {
  return <div style={{ height: 1, background: 'var(--et-border)', margin: '14px 0' }} />
}

function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-baseline justify-between" style={{ marginTop: 18, marginBottom: 6 }}>
      <p className="numbered-eyebrow">{title.toUpperCase()}</p>
      {action && (
        <button onClick={onAction} className="no-print press" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--et-blue)' }}>
          {action}
        </button>
      )}
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="no-print" style={{ fontSize: '12px', color: 'var(--et-placeholder)', lineHeight: 1.55, marginBottom: 8 }}>
      {children}
    </p>
  )
}

function MiniBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontSize: '11.5px', fontWeight: 600,
        color: danger ? 'var(--et-red)' : 'var(--et-blue)',
      }}
    >
      {children}
    </button>
  )
}

/**
 * An editable span that looks like the document, not like a form control.
 *
 * A textarea in every slot would make the page read as a settings screen. This
 * only shows its border on focus, so at rest the page IS the resume and on
 * print the borders are gone entirely.
 */
function Field({
  value, onChange, placeholder, multiline, small, style,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  multiline?: boolean
  small?: boolean
  style?: React.CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !multiline) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value, multiline])

  const common: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: small ? '12.5px' : '14px',
    color: small ? 'var(--et-muted)' : 'var(--et-ink)',
    background: focused ? 'var(--et-surface-2)' : 'transparent',
    border: `1px solid ${focused ? 'var(--et-border-mid)' : 'transparent'}`,
    borderRadius: 7,
    padding: '3px 6px',
    outline: 'none',
    width: small ? undefined : '100%',
    minWidth: small ? 90 : undefined,
    ...style,
  }

  if (multiline) {
    return (
      <textarea
        ref={ref}
        className="field"
        value={value}
        rows={1}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...common, resize: 'none', overflow: 'hidden', display: 'block' }}
      />
    )
  }

  return (
    <input
      className="field"
      value={value}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value)}
      style={common}
    />
  )
}
