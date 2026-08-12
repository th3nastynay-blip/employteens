'use client'

/**
 * EMPLOYTEENS — third-party AI consent gate
 *
 * REQUIRED BY APP STORE GUIDELINE 5.1.2(i), quoted from Apple verbatim:
 *
 *   "You must clearly disclose where personal data will be shared with third
 *   parties, INCLUDING WITH THIRD-PARTY AI, and obtain explicit permission
 *   before doing so."
 *
 * Before this existed, opening the coach sent a teen's first name, age, grade,
 * state, ZIP, availability, transport, skills, interests and application history
 * to api.groq.com, and the only place that was mentioned was a privacy policy
 * they had never opened. Disclosure is half the rule; the other half is
 * permission, and permission has to be a thing the user does.
 *
 * WHAT MAKES CONSENT REAL, AND WHY EACH PART IS HERE
 *
 *   NAMED PROVIDER. "We use AI to help you" is not disclosure. Groq, Inc. is
 *   named, so the person agreeing knows who receives it.
 *
 *   ITEMISED DATA. The exact fields are listed, not summarised as "some profile
 *   information". A reviewer will compare this list against the network request.
 *
 *   DECLINE IS A REAL OPTION. "Not now" leaves the coach off and the rest of the
 *   app fully working. A consent dialog whose refusal path breaks the product is
 *   coercion, and Apple treats gating unrelated functionality on a permission as
 *   its own violation.
 *
 *   REVOCABLE. Stored as a timestamp that the profile can clear. Consent you
 *   cannot withdraw is not consent under GDPR or the state statutes that follow
 *   it, and our users are minors, which is where regulators look hardest.
 *
 *   PRE-CHECKED NOTHING. No default-on toggle. For minors' data specifically,
 *   opt-out patterns are what draws enforcement.
 *
 * The record lives in users.ai_consent_at. Absent or null means never asked or
 * refused, and both are treated identically: do not send.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'

/** Update BOTH of these together when the provider or payload changes. Then the privacy policy. */
export const AI_PROVIDER = 'Groq, Inc.'
export const AI_MODEL = 'Llama 3.3'

const SENT = [
  'The messages you type to the coach',
  'Your first name, age and school grade',
  'Your state and ZIP code',
  'The days you are free and how you get around',
  'Your skills and interests',
  'A summary of your job matches and applications',
]

interface Props {
  onAccept: () => void | Promise<void>
  onDecline: () => void
}

export function AIConsent({ onAccept, onDecline }: Props) {
  const [busy, setBusy] = useState(false)

  async function accept() {
    setBusy(true)
    try {
      await onAccept()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '8px 4px 24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: 'var(--et-surface)',
          border: '1px solid var(--et-border)',
          borderRadius: 22,
          padding: 20,
        }}
      >
        <p className="numbered-eyebrow" style={{ marginBottom: 8 }}>BEFORE YOU START</p>
        <h2 className="display display-md" style={{ lineHeight: 1.25 }}>
          The coach sends your info to another company
        </h2>

        <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--et-subtle)', marginTop: 10 }}>
          To answer you properly, EmployTeens sends your message and some of your profile to{' '}
          <b>{AI_PROVIDER}</b>, which runs the {AI_MODEL} model. They generate the reply and
          send it back. We do not pay them with your data and it is not used to advertise to you.
        </p>

        <div
          style={{
            marginTop: 14, padding: '13px 15px', borderRadius: 14,
            background: 'var(--et-surface-2)', border: '1px solid var(--et-border)',
          }}
        >
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--et-ink)', marginBottom: 8 }}>
            Exactly what gets sent
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 0, listStyle: 'none' }}>
            {SENT.map((s) => (
              <li key={s} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ width: 4, height: 4, borderRadius: 99, background: 'var(--et-placeholder)', marginTop: 7, flexShrink: 0 }} />
                <span style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'var(--et-subtle)' }}>{s}</span>
              </li>
            ))}
          </ul>
          <p style={{ fontSize: '11.5px', lineHeight: 1.5, color: 'var(--et-placeholder)', marginTop: 10 }}>
            Not sent: your email, your password, your resume, or anything about your reference.
          </p>
        </div>

        <p style={{ fontSize: '12.5px', lineHeight: 1.6, color: 'var(--et-subtle)', marginTop: 14 }}>
          You do not have to agree. The job feed, Explore, your profile and your resume all work
          the same either way — you just will not have the coach. You can change your mind later
          in your profile, and turning it off stops anything further being sent.
        </p>

        <p style={{ fontSize: '12px', lineHeight: 1.6, color: 'var(--et-muted)', marginTop: 12 }}>
          Replies are written by software and can be wrong, including about pay and hiring ages.
          Check anything important with the employer or an adult you trust. Full detail in our{' '}
          <a href="/privacy" style={{ color: 'var(--et-blue)', textDecoration: 'underline' }}>
            Privacy Policy
          </a>.
        </p>

        <div className="flex flex-col" style={{ gap: 8, marginTop: 18 }}>
          <button
            onClick={accept}
            disabled={busy}
            className="press"
            style={{
              width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--et-match-from), var(--et-match-to))',
              color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px',
              opacity: busy ? 0.6 : 1,
              boxShadow: '0 4px 14px rgba(37,99,235,0.26)',
            }}
          >
            {busy ? 'One second…' : `I agree — use ${AI_PROVIDER.replace(', Inc.', '')}`}
          </button>
          <button
            onClick={onDecline}
            className="press"
            style={{
              width: '100%', height: 46, borderRadius: 14, cursor: 'pointer',
              background: 'var(--et-surface)', border: '1px solid var(--et-border-mid)',
              color: 'var(--et-subtle)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
            }}
          >
            No thanks — keep the coach off
          </button>
        </div>
      </motion.div>
    </div>
  )
}
