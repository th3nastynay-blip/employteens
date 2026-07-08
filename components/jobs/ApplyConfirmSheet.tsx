'use client'

/**
 * EMPLOYTEENS — "Did you apply?" bottom sheet
 *
 * Mounted once in the (app) layout. Watches for the user returning to the
 * app after an Apply click (visibilitychange + focus + mount) and asks
 * whether they actually applied. Only a confirmed Yes writes
 * status='applied' — clicking Apply alone never does.
 */

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  getPendingApply,
  clearPendingApply,
  optOutOfApplyPrompt,
  type PendingApply,
} from '@/lib/apply-tracking'

export function ApplyConfirmSheet() {
  const [pending, setPending] = useState<PendingApply | null>(null)
  const [saving, setSaving] = useState(false)

  const check = useCallback(() => {
    // Small delay so the check runs after the tab is actually interactive
    setTimeout(() => {
      const p = getPendingApply()
      // Only prompt if the click was at least 15s ago — an instant re-focus
      // means they bounced straight back and haven't had time to apply.
      if (p && Date.now() - p.ts > 15_000) setPending(p)
    }, 600)
  }, [])

  useEffect(() => {
    check()
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', check)
    }
  }, [check])

  async function confirmYes() {
    if (!pending) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('applications').upsert(
          { user_id: user.id, job_id: pending.jobId, status: 'applied' },
          { onConflict: 'user_id,job_id' },
        )
      }
    } catch { /* non-critical */ }
    clearPendingApply()
    setPending(null)
    setSaving(false)
  }

  function notYet() {
    clearPendingApply()
    setPending(null)
  }

  function dontAskAgain() {
    optOutOfApplyPrompt()
    setPending(null)
  }

  return (
    <AnimatePresence>
      {pending && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={notYet}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,15,20,0.45)',
              zIndex: 60, backdropFilter: 'blur(2px)',
            }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 61,
              maxWidth: 384, margin: '0 auto',
              background: 'var(--et-surface)',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px calc(20px + env(safe-area-inset-bottom))',
              boxShadow: '0 -8px 40px rgba(15,15,20,0.18)',
            }}
          >
            <div style={{
              width: 36, height: 4, borderRadius: 2, background: 'var(--et-border-mid)',
              margin: '0 auto 16px',
            }} />

            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--et-placeholder)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              Quick check
            </p>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--et-ink)', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              Did you apply to {pending.title}?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: 4, marginBottom: 18 }}>
              {pending.company} — we&apos;ll track it so you can follow up later.
            </p>

            <div className="flex flex-col gap-2.5">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={confirmYes}
                disabled={saving}
                className="btn-primary"
                style={{ height: 48, borderRadius: 'var(--radius-md)', fontSize: '15px', fontWeight: 700 }}
              >
                {saving ? 'Saving…' : 'Yes, I applied ✓'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={notYet}
                style={{
                  height: 48, borderRadius: 'var(--radius-md)', fontSize: '15px', fontWeight: 600,
                  background: 'var(--et-surface-2)', color: 'var(--et-subtle)',
                  border: '1.5px solid var(--et-border-mid)', cursor: 'pointer',
                }}
              >
                Not yet
              </motion.button>
              <button
                onClick={dontAskAgain}
                style={{
                  background: 'none', border: 'none', padding: '6px 0 0',
                  fontSize: '12px', color: 'var(--et-placeholder)', fontWeight: 500, cursor: 'pointer',
                }}
              >
                Don&apos;t ask again
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
