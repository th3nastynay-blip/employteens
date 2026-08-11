'use client'

/**
 * EMPLOYTEENS — /vouch/[token]
 *
 * The one page in the app written for an adult rather than a teen, and the one
 * place a claim gets confirmed by somebody other than the person making it.
 *
 * Design constraints, all of them consequences of who opens this:
 *
 *   - They have never heard of us. So the page explains itself in one line
 *     before it asks for anything, and asks for as close to nothing as
 *     possible: one tap, name optional.
 *   - They are probably on a phone, mid-shift, having been sent a text by a
 *     kid they supervise. No signup, no login, no app install.
 *   - Declining has to be as easy as confirming. A vouch you cannot refuse is
 *     worthless as evidence, and pressuring a supervisor into a yes would make
 *     the whole ladder a lie.
 *   - It sits OUTSIDE the (app) group, so no bottom nav and no auth.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'

type Info = {
  studentFirstName: string
  askedName: string
  askedRole: string
  askedOrg: string | null
  alreadyConfirmed: boolean
  alreadyDeclined: boolean
}

export default function VouchPage() {
  const params = useParams<{ token: string }>()
  const token = String(params?.token ?? '')

  const [info, setInfo] = useState<Info | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'expired' | 'missing' | 'done' | 'declined'>('loading')
  const [who, setWho] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/reference?token=${encodeURIComponent(token)}`)
      if (res.status === 410) { setState('expired'); return }
      if (!res.ok) { setState('missing'); return }
      const data = (await res.json()) as Info
      setInfo(data)
      setWho(data.askedName ?? '')
      setState(data.alreadyConfirmed ? 'done' : data.alreadyDeclined ? 'declined' : 'ready')
    } catch {
      setState('missing')
    }
  }, [token])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function answer(decision: 'confirm' | 'decline') {
    setSaving(true)
    try {
      await fetch('/api/reference', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, decision, confirmedBy: who }),
      })
      setState(decision === 'confirm' ? 'done' : 'declined')
    } catch { /* leave the buttons up so they can retry */ }
    setSaving(false)
  }

  return (
    <main
      style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', background: 'var(--et-ground)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%', maxWidth: 440, background: 'var(--et-surface)',
          borderRadius: 22, padding: 26, border: '1px solid var(--et-border)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
        }}
      >
        {state === 'loading' && <div className="skeleton" style={{ height: 160, borderRadius: 14 }} />}

        {state === 'missing' && (
          <Message
            title="This link doesn’t work"
            body="It may have been mistyped, or the student may have since asked someone else. Nothing to do here."
          />
        )}

        {state === 'expired' && (
          <Message
            title="This link has expired"
            body="Vouch links last 30 days. If the student still needs a reference, they can send you a fresh one from the app."
          />
        )}

        {state === 'done' && info && (
          <Message
            title="Thank you"
            body={`We’ve recorded that you’d vouch for ${info.studentFirstName}. That’s the only part of their profile confirmed by someone other than them, so it counts for a lot. You can close this page.`}
            tone="good"
          />
        )}

        {state === 'declined' && (
          <Message
            title="Noted, and thank you"
            body="We’ve recorded that you’d rather not, and the student will simply be prompted to ask someone else. They are not told who declined."
          />
        )}

        {state === 'ready' && info && (
          <>
            <p className="numbered-eyebrow">EMPLOYTEENS</p>
            <h1 className="display display-lg" style={{ marginTop: 6, lineHeight: 1.15 }}>
              Would you vouch for {info.studentFirstName}?
            </h1>

            <p style={{ fontSize: '14.5px', lineHeight: 1.6, color: 'var(--et-subtle)', marginTop: 12 }}>
              {info.studentFirstName} is using EmployTeens to find their first job, and listed you
              as someone who knows their work
              {info.askedOrg ? ` from ${info.askedOrg}` : ''}
              {info.askedRole ? ` — as their ${info.askedRole.toLowerCase()}` : ''}.
            </p>

            <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--et-muted)', marginTop: 12 }}>
              You are only confirming that you know them and would speak well of them if an
              employer asked. Nothing is published, no employer gets your contact details from
              us, and you are not agreeing to be contacted.
            </p>

            <label style={{ display: 'block', marginTop: 20 }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--et-placeholder)' }}>
                YOUR NAME AND ROLE (OPTIONAL)
              </span>
              <input
                className="input"
                value={who}
                onChange={(e) => setWho(e.target.value)}
                placeholder="e.g. Dana Ruiz, shift supervisor"
                style={{ marginTop: 6, width: '100%' }}
              />
            </label>

            <button
              onClick={() => answer('confirm')}
              disabled={saving}
              className="press"
              style={{
                width: '100%', height: 52, borderRadius: 15, marginTop: 16, border: 'none',
                background: 'linear-gradient(135deg, var(--et-match-from), var(--et-match-to))',
                color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px',
                cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
                boxShadow: '0 4px 14px rgba(37,99,235,0.28)',
              }}
            >
              {saving ? 'Saving…' : 'Yes, I’d vouch for them'}
            </button>

            {/* Deliberately a real, unembarrassing button rather than fine print.
                If declining feels like a confession, the yes stops meaning anything. */}
            <button
              onClick={() => answer('decline')}
              disabled={saving}
              className="press"
              style={{
                width: '100%', height: 46, borderRadius: 15, marginTop: 8,
                background: 'var(--et-surface)', border: '1.5px solid var(--et-border-mid)',
                color: 'var(--et-subtle)', fontFamily: 'var(--font-display)',
                fontWeight: 700, fontSize: '14.5px', cursor: saving ? 'default' : 'pointer',
              }}
            >
              I’d rather not
            </button>

            <p style={{ fontSize: '11.5px', color: 'var(--et-placeholder)', marginTop: 14, lineHeight: 1.5, textAlign: 'center' }}>
              EmployTeens is a free job app for 14–19 year olds in New York and New Jersey.
              We don’t sell data.
            </p>
          </>
        )}
      </motion.div>
    </main>
  )
}

function Message({ title, body, tone }: { title: string; body: string; tone?: 'good' }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      {tone === 'good' && (
        <div
          style={{
            width: 52, height: 52, borderRadius: '50%', margin: '0 auto 14px',
            background: 'var(--et-green-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12.5L10 17.5L19 7.5" stroke="var(--et-green)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      <h1 className="display display-md">{title}</h1>
      <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--et-muted)', marginTop: 8 }}>{body}</p>
    </div>
  )
}
