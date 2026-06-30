'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { FeedSection } from '@/components/jobs/FeedSection'
import { MOCK_JOBS, FEED_SECTIONS } from '@/lib/data/mock-jobs'
import type { JobMatch } from '@/lib/types/database'

type FeedTab = 'best_matches' | 'new_near_you' | 'high_probability'

const TABS: { key: FeedTab; label: string; count?: number }[] = [
  { key: 'best_matches', label: 'Best Matches' },
  { key: 'new_near_you', label: 'Near You' },
  { key: 'high_probability', label: 'Quick Hire' },
]

const SCAN_STATES = [
  'Scanning jobs in your area…',
  'Matching to your schedule…',
  'Ranking by fit…',
]

export default function DashboardPage() {
  const [userName, setUserName] = useState('')
  const [activeTab, setActiveTab] = useState<FeedTab>('best_matches')
  const [savedJobs, setSavedJobs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [scanIdx, setScanIdx] = useState(0)
  const [jobs] = useState<Record<FeedTab, JobMatch[]>>(FEED_SECTIONS as Record<FeedTab, JobMatch[]>)

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single()

        if (profile?.name) setUserName(profile.name.split(' ')[0])

        const { data: applications } = await supabase
          .from('applications')
          .select('job_id')
          .eq('user_id', user.id)
          .eq('status', 'saved')

        if (applications) setSavedJobs(applications.map((a: { job_id: string }) => a.job_id))
      }

      let i = 0
      const interval = setInterval(() => {
        i++
        setScanIdx(i)
        if (i >= SCAN_STATES.length - 1) {
          clearInterval(interval)
          setTimeout(() => setIsLoading(false), 600)
        }
      }, 700)
    }

    loadDashboard()
  }, [])

  async function handleSave(jobId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (savedJobs.includes(jobId)) {
      setSavedJobs((prev) => prev.filter((id) => id !== jobId))
      await supabase.from('applications').delete().eq('user_id', user.id).eq('job_id', jobId)
    } else {
      setSavedJobs((prev) => [...prev, jobId])
      await supabase.from('applications').upsert({ user_id: user.id, job_id: jobId, status: 'saved' })
    }
  }

  const hour = new Date().getHours()
  const timeLabel = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const totalJobs = MOCK_JOBS.length

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Header ── */}
      <div className="px-5 pt-12 pb-5">
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: '14px', color: 'var(--et-muted)', fontWeight: 500 }}
        >
          Good {timeLabel}{userName ? `, ${userName}` : ''} 👋
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          style={{
            fontSize: '26px',
            fontWeight: 800,
            color: 'var(--et-ink)',
            letterSpacing: '-0.03em',
            marginTop: '3px',
            lineHeight: 1.15,
          }}
        >
          {isLoading ? 'Finding your matches…' : `${totalJobs} jobs matched today`}
        </motion.h1>

        {/* AI scan status */}
        <div style={{ marginTop: '6px', height: '18px' }}>
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key={scanIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <div className="flex gap-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <span style={{ fontSize: '12px', color: 'var(--et-blue)', fontWeight: 600 }}>
                  {SCAN_STATES[scanIdx]}
                </span>
              </motion.div>
            ) : (
              <motion.p
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ fontSize: '12px', color: 'var(--et-placeholder)' }}
              >
                AI feed · updated just now
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div
        className="flex gap-2 px-5 pb-4 scrollbar-hide overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {TABS.map(({ key, label }) => {
          const active = activeTab === key
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(key)}
              style={{
                flexShrink: 0,
                height: '36px',
                padding: '0 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '13px',
                fontWeight: active ? 700 : 500,
                border: active ? 'none' : '1.5px solid var(--et-border-mid)',
                background: active ? 'var(--et-blue)' : 'var(--et-surface)',
                color: active ? '#fff' : 'var(--et-subtle)',
                boxShadow: active ? 'var(--shadow-blue-sm)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                letterSpacing: '-0.01em',
              }}
            >
              {label}
            </motion.button>
          )
        })}
      </div>

      {/* ── Feed ── */}
      <div className="px-4 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="card-elevated"
                    style={{ height: 200, animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="px-5 pt-5 pb-4 flex items-start gap-4" style={{ borderBottom: '1px solid var(--et-border)' }}>
                      <div className="skeleton" style={{ width: 72, height: 72, borderRadius: '50%' }} />
                      <div className="flex-1 flex flex-col gap-2 pt-1">
                        <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 6 }} />
                        <div className="skeleton" style={{ height: 18, width: '70%', borderRadius: 6 }} />
                        <div className="skeleton" style={{ height: 12, width: '50%', borderRadius: 6 }} />
                      </div>
                    </div>
                    <div className="px-5 pt-4 flex flex-col gap-2">
                      <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 6 }} />
                      <div className="skeleton" style={{ height: 12, width: '60%', borderRadius: 6 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <FeedSection
                jobs={jobs[activeTab]}
                savedJobs={savedJobs}
                onSave={handleSave}
                emptyState="No matches in this category yet — check back tomorrow."
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
