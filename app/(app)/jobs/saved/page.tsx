'use client'

/**
 * EMPLOYTEENS — Jobs Tracker: Saved / Applied / Archived
 *
 * Saved     → status 'saved'
 * Applied   → status 'applied' | 'interviewing' | 'offered'
 *             (with status progression controls — interview, offer)
 * Archived  → status 'rejected'
 *
 * Application status only ever reaches 'applied' through the user
 * confirming "Yes, I applied" in ApplyConfirmSheet — never from a click.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { JobCard } from '@/components/jobs/JobCard'
import type { JobMatch, JobRow, ApplicationRow } from '@/lib/types/database'

type AppStatus = ApplicationRow['status']
type Tab = 'saved' | 'applied' | 'archived'

interface TrackedJob {
  job: JobMatch
  status: AppStatus
  updated_at?: string
  created_at: string
}

const TAB_STATUSES: Record<Tab, AppStatus[]> = {
  saved: ['saved'],
  applied: ['applied', 'interviewing', 'offered'],
  archived: ['rejected'],
}

const STATUS_LABEL: Record<AppStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interviewing: 'Interview',
  offered: 'Offer',
  rejected: 'Not selected',
}

const STATUS_COLOR: Record<AppStatus, { bg: string; fg: string }> = {
  saved:        { bg: 'var(--et-blue-light)', fg: 'var(--et-blue)' },
  applied:      { bg: 'var(--et-blue-light)', fg: 'var(--et-blue)' },
  interviewing: { bg: 'rgba(245,158,11,0.12)', fg: '#B45309' },
  offered:      { bg: 'var(--et-green-light)', fg: 'var(--et-green)' },
  rejected:     { bg: 'var(--et-surface-2)', fg: 'var(--et-muted)' },
}

function daysAgo(iso?: string): string {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

export default function JobsTrackerPage() {
  const [tracked, setTracked] = useState<TrackedJob[]>([])
  const [tab, setTab] = useState<Tab>('saved')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('applications')
      .select('job_id, status, created_at, updated_at, jobs (*)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    type RawApp = { job_id: string; status: AppStatus; created_at: string; updated_at?: string; jobs: unknown }
    const rows = (data ?? []) as unknown as RawApp[]

    setTracked(
      rows
        .filter((a) => a.jobs && typeof a.jobs === 'object')
        .map((a) => ({
          job: { ...(a.jobs as JobRow), match_score: 0, match_explanation: '' },
          status: a.status,
          created_at: a.created_at,
          updated_at: a.updated_at,
        })),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    // async data fetch — state updates happen after awaits, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  async function setStatus(jobId: string, status: AppStatus) {
    setTracked((prev) => prev.map((t) => (t.job.id === jobId ? { ...t, status, updated_at: new Date().toISOString() } : t)))
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('job_id', jobId)
  }

  async function handleUnsave(jobId: string) {
    setTracked((prev) => prev.filter((t) => t.job.id !== jobId))
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('applications').delete().eq('user_id', user.id).eq('job_id', jobId)
  }

  const visible = tracked.filter((t) => TAB_STATUSES[tab].includes(t.status))
  const counts: Record<Tab, number> = {
    saved: tracked.filter((t) => TAB_STATUSES.saved.includes(t.status)).length,
    applied: tracked.filter((t) => TAB_STATUSES.applied.includes(t.status)).length,
    archived: tracked.filter((t) => TAB_STATUSES.archived.includes(t.status)).length,
  }

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-12 pb-4">
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--et-ink)' }}>
          My Jobs
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--et-muted)', marginTop: 4 }}>
          {loading ? 'Loading…' : 'Track everything from saved to hired'}
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="px-5 pb-4">
        <div
          className="flex gap-1 p-1"
          style={{ background: 'var(--et-surface)', borderRadius: 12, border: '1px solid var(--et-border)' }}
        >
          {(['saved', 'applied', 'archived'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 relative"
              style={{
                padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 700,
                background: 'transparent',
                color: tab === t ? 'var(--et-ink)' : 'var(--et-muted)',
                transition: 'color 0.15s ease',
              }}
            >
              {tab === t && (
                <motion.div
                  layoutId="tab-pill"
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 9,
                    background: 'var(--et-surface-2)',
                    border: '1px solid var(--et-border-mid)',
                  }}
                  transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                />
              )}
              <span className="relative">
                {t === 'saved' ? 'Saved' : t === 'applied' ? 'Applied' : 'Archived'}
                {counts[t] > 0 && (
                  <span style={{ marginLeft: 5, fontSize: '11px', color: tab === t ? 'var(--et-blue)' : 'var(--et-placeholder)' }}>
                    {counts[t]}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="text-4xl">🔖</div>
            <p style={{ color: 'var(--et-placeholder)', fontSize: '14px' }}>Loading your jobs…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span style={{ fontSize: '48px' }}>{tab === 'saved' ? '📭' : tab === 'applied' ? '📨' : '🗂️'}</span>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--et-subtle)' }}>
                {tab === 'saved' ? 'No saved jobs yet' : tab === 'applied' ? 'No applications yet' : 'Nothing archived'}
              </p>
              <p style={{ fontSize: '14px', color: 'var(--et-placeholder)', marginTop: 4 }}>
                {tab === 'saved'
                  ? 'Hit save on any job in your feed'
                  : tab === 'applied'
                    ? 'When you apply to a job, confirm it and it shows up here'
                    : 'Jobs that didn’t work out end up here'}
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {visible.map((t, i) => (
              <motion.div
                key={t.job.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: i * 0.05 }}
              >
                {/* Status strip above the card for applied/archived */}
                {tab !== 'saved' && (
                  <div
                    className="flex items-center justify-between px-4 py-2.5 mb-[-10px] relative z-10 mx-2"
                    style={{
                      background: STATUS_COLOR[t.status].bg,
                      borderRadius: '12px 12px 0 0',
                      border: '1px solid var(--et-border)',
                      borderBottom: 'none',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 700, color: STATUS_COLOR[t.status].fg }}>
                      {STATUS_LABEL[t.status]}
                      <span style={{ fontWeight: 500, color: 'var(--et-muted)', marginLeft: 6 }}>
                        {t.status === 'applied' ? `applied ${daysAgo(t.updated_at)}` : `updated ${daysAgo(t.updated_at)}`}
                      </span>
                    </span>
                  </div>
                )}

                <JobCard job={t.job} onSave={handleUnsave} isSaved={true} index={i} />

                {/* Status progression controls */}
                {tab === 'applied' && (
                  <div className="flex gap-2 px-2 mt-2">
                    {t.status !== 'interviewing' && t.status !== 'offered' && (
                      <StatusButton label="🎤 Got an interview" onClick={() => setStatus(t.job.id, 'interviewing')} />
                    )}
                    {t.status !== 'offered' && (
                      <StatusButton label="🎉 Got an offer" onClick={() => setStatus(t.job.id, 'offered')} />
                    )}
                    <StatusButton label="Archive" muted onClick={() => setStatus(t.job.id, 'rejected')} />
                  </div>
                )}
                {tab === 'archived' && (
                  <div className="flex gap-2 px-2 mt-2">
                    <StatusButton label="Move back to Applied" onClick={() => setStatus(t.job.id, 'applied')} />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

function StatusButton({ label, onClick, muted }: { label: string; onClick: () => void; muted?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      style={{
        flex: muted ? '0 0 auto' : 1,
        padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
        fontSize: '12px', fontWeight: 600,
        background: muted ? 'transparent' : 'var(--et-surface)',
        color: muted ? 'var(--et-placeholder)' : 'var(--et-subtle)',
        border: muted ? '1px solid transparent' : '1px solid var(--et-border-mid)',
      }}
    >
      {label}
    </motion.button>
  )
}
