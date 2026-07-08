/**
 * EMPLOYTEENS — Apply-click tracking (client-side)
 *
 * Clicking "Apply" does NOT mean the user applied — they opened an external
 * page and may have bounced. So the apply click is recorded here (localStorage)
 * as a PENDING event, and when the user returns to the app, ApplyConfirmSheet
 * asks "Did you apply?" — only a confirmed Yes writes status='applied'.
 *
 * localStorage keys:
 *   et-pending-apply      one pending click: { jobId, title, company, ts }
 *   et-apply-prompt-off   "1" when the user chose Don't ask again
 */

export interface PendingApply {
  jobId: string
  title: string
  company: string
  ts: number
}

const PENDING_KEY = 'et-pending-apply'
const OPT_OUT_KEY = 'et-apply-prompt-off'
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // stale after 24h — don't ask about last week

export function recordApplyClick(job: { id: string; title: string; company: string }) {
  try {
    if (localStorage.getItem(OPT_OUT_KEY) === '1') return
    const pending: PendingApply = {
      jobId: job.id,
      title: job.title,
      company: job.company,
      ts: Date.now(),
    }
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  } catch {
    // localStorage unavailable — degrade silently
  }
}

export function getPendingApply(): PendingApply | null {
  try {
    if (localStorage.getItem(OPT_OUT_KEY) === '1') return null
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const pending = JSON.parse(raw) as PendingApply
    if (!pending?.jobId || Date.now() - pending.ts > MAX_AGE_MS) {
      localStorage.removeItem(PENDING_KEY)
      return null
    }
    return pending
  } catch {
    return null
  }
}

export function clearPendingApply() {
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch { /* noop */ }
}

export function optOutOfApplyPrompt() {
  try {
    localStorage.setItem(OPT_OUT_KEY, '1')
    localStorage.removeItem(PENDING_KEY)
  } catch { /* noop */ }
}
