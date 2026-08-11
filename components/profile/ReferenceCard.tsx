'use client'

/**
 * EMPLOYTEENS — the reference card
 *
 * The only place in the app where a teen can produce evidence that is not
 * their own word. Four states, and the copy in each one matters more than the
 * layout:
 *
 *   NONE       nobody asked yet. The job here is to explain that asking is
 *              normal, because "can you be my reference" is the thing teens
 *              most reliably never think to do while they still work
 *              somewhere, and it is much harder six months later.
 *   PENDING    named, link minted, adult has not answered. Show the link and
 *              make sending it one tap.
 *   CONFIRMED  the adult said yes. This is the payoff and it should look like
 *              one.
 *   DECLINED   the adult said no. Handled gently and WITHOUT naming them —
 *              see the note in that branch.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ReferenceState {
  name: string | null
  role: string | null
  org: string | null
  confirmedAt: string | null
  confirmedBy: string | null
  declinedAt: string | null
  token: string | null
}

interface Props {
  reference: ReferenceState
  onSaved: () => void
}

export function ReferenceCard({ reference, onSaved }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(reference.name ?? '')
  const [role, setRole] = useState(reference.role ?? '')
  const [org, setOrg] = useState(reference.org ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(
    reference.token && typeof window !== 'undefined'
      ? `${window.location.origin}/vouch/${reference.token}`
      : null,
  )
  const [copied, setCopied] = useState(false)

  const confirmed = Boolean(reference.confirmedAt)
  const declined = Boolean(reference.declinedAt) && !confirmed
  const pending = Boolean(reference.name) && !confirmed && !declined

  async function save() {
    if (!name.trim() || !role.trim()) {
      setError('We need their name and what they do.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, org }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error([data.error, data.hint].filter(Boolean).join(' — ') || 'Could not save')
      // Build the URL from the page we are actually on, not from data.url.
      // The server used to derive it from NEXT_PUBLIC_APP_URL, which is
      // localhost:3000, so the freshly-minted link sent people to their own
      // machine. The server is fixed too, but the browser already knows the
      // right origin for certain and cannot be misconfigured.
      const token = String(data.url ?? '').split('/vouch/')[1] ?? ''
      setLink(token ? `${window.location.origin}/vouch/${token}` : data.url)
      setEditing(false)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    }
    setSaving(false)
  }

  async function share() {
    if (!link) return
    const text = `Hi ${reference.name ?? ''} — I'm using EmployTeens to find a job and put you down as someone who knows my work. Would you tap this and confirm? Takes a second: ${link}`
    // Native share first: on a phone this opens Messages, which is where this
    // conversation actually happens. Clipboard is the desktop fallback.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch { /* user cancelled — fall through to copy */ }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch { /* clipboard blocked; the link is on screen to select manually */ }
  }

  return (
    <div
      className={confirmed ? 'grad-border' : ''}
      style={{
        background: 'var(--et-surface)',
        border: confirmed ? undefined : '1px solid var(--et-border)',
        borderRadius: 18,
        padding: 18,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <p className="numbered-eyebrow">YOUR REFERENCE</p>
        {confirmed && (
          <span className="pill pill-green">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Verified
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Confirmed ── */}
        {confirmed && !editing && (
          <motion.div key="confirmed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="display display-md">{reference.name} vouched for you</h3>
            <p style={{ fontSize: '13px', color: 'var(--et-subtle)', marginTop: 6, lineHeight: 1.55 }}>
              {reference.confirmedBy
                ? `They confirmed as ${reference.confirmedBy}.`
                : `Confirmed as your ${(reference.role ?? 'reference').toLowerCase()}${reference.org ? ` at ${reference.org}` : ''}.`}
              {' '}This is the only part of your profile someone other than you has confirmed,
              which is exactly why it is worth the most.
            </p>
            <button onClick={() => setEditing(true)} style={linkBtn}>Change who this is</button>
          </motion.div>
        )}

        {/* ── Pending ── */}
        {pending && !editing && (
          <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="display display-md">Waiting on {reference.name}</h3>
            <p style={{ fontSize: '13px', color: 'var(--et-subtle)', marginTop: 6, lineHeight: 1.55 }}>
              Send them the link. They tap once to confirm — no account, no signup, and
              they are not agreeing to be contacted by anyone.
            </p>

            <button onClick={share} className="press" style={primaryBtn}>
              {copied ? 'Copied — paste it to them' : 'Send them the link'}
            </button>

            {link && (
              <p
                style={{
                  fontSize: '11px', color: 'var(--et-placeholder)', marginTop: 10,
                  wordBreak: 'break-all', lineHeight: 1.5,
                }}
              >
                {link}
              </p>
            )}
            <button onClick={() => setEditing(true)} style={linkBtn}>Ask someone else instead</button>
          </motion.div>
        )}

        {/* ── Declined ──
            Deliberately does NOT say who declined or treat it as a failure. A
            supervisor saying no is usually about company policy, not about the
            teen, and a 15-year-old reading "X refused to vouch for you" is a
            genuinely bad afternoon we can avoid with better wording. */}
        {declined && !editing && (
          <motion.div key="declined" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="display display-md">Try someone else</h3>
            <p style={{ fontSize: '13px', color: 'var(--et-subtle)', marginTop: 6, lineHeight: 1.55 }}>
              That one did not come through. It happens constantly for reasons that have
              nothing to do with you — plenty of managers are told not to give references
              at all. A coach, teacher, or someone who ran a program you volunteered at
              counts just as much.
            </p>
            <button onClick={() => setEditing(true)} className="press" style={primaryBtn}>
              Ask someone else
            </button>
          </motion.div>
        )}

        {/* ── Nobody asked yet ── */}
        {!reference.name && !editing && (
          <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="display display-md">Get someone to vouch for you</h3>
            <p style={{ fontSize: '13px', color: 'var(--et-subtle)', marginTop: 6, lineHeight: 1.55 }}>
              A manager, coach, teacher, or whoever ran a program you helped at. Everything
              else on your profile is you saying it. This is the one thing an employer can
              check, so it is worth more than all of it.
            </p>
            <button onClick={() => setEditing(true)} className="press" style={primaryBtn}>
              Add a reference
            </button>
          </motion.div>
        )}

        {/* ── Form ── */}
        {editing && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Field label="Their name" value={name} onChange={setName} placeholder="Dana Ruiz" />
            <Field label="What they do" value={role} onChange={setRole} placeholder="Shift supervisor" />
            <Field label="Where you know them from (optional)" value={org} onChange={setOrg} placeholder="North Bergen Library" />

            {error && (
              <p style={{ fontSize: '12px', color: 'var(--et-red, #DC2626)', marginTop: 8 }}>{error}</p>
            )}

            <p style={{ fontSize: '11.5px', color: 'var(--et-placeholder)', marginTop: 12, lineHeight: 1.5 }}>
              We do not email them. You get a link and send it yourself, however you
              normally talk to them.
            </p>

            <div className="flex gap-2" style={{ marginTop: 12 }}>
              <button onClick={() => setEditing(false)} className="press" style={secondaryBtn}>Cancel</button>
              <button onClick={save} disabled={saving} className="press" style={{ ...primaryBtn, marginTop: 0, flex: 1, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Get the link'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <label style={{ display: 'block', marginTop: 10 }}>
      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--et-placeholder)' }}>
        {label.toUpperCase()}
      </span>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ marginTop: 5, width: '100%' }}
      />
    </label>
  )
}

const primaryBtn: React.CSSProperties = {
  width: '100%', height: 46, borderRadius: 13, marginTop: 14, border: 'none',
  background: 'linear-gradient(135deg, var(--et-match-from), var(--et-match-to))',
  color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14.5px',
  cursor: 'pointer',
}

const secondaryBtn: React.CSSProperties = {
  height: 46, padding: '0 16px', borderRadius: 13,
  background: 'var(--et-surface)', border: '1.5px solid var(--et-border-mid)',
  color: 'var(--et-subtle)', fontFamily: 'var(--font-display)', fontWeight: 700,
  fontSize: '14.5px', cursor: 'pointer',
}

const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, marginTop: 12,
  fontSize: '12.5px', fontWeight: 600, color: 'var(--et-blue)', cursor: 'pointer',
}
