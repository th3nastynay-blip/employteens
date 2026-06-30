'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { FeedSection } from '@/components/jobs/FeedSection'
import { MOCK_JOBS, FEED_SECTIONS } from '@/lib/data/mock-jobs'
import type { JobMatch } from '@/lib/types/database'

type FeedTab = 'best_matches' | 'new_near_you' | 'high_probability'

const TABS: { key: FeedTab; label: string; emoji: string }[] = [
  { key: 'best_matches', label: 'Best Matches', emoji: '🎯' },
  { key: 'new_near_you', label: 'Near You', emoji: '📍' },
  { key: 'high_probability', label: 'Quick Hire', emoji: '⚡' },
]

const AI_GREETING_STATES = [
  'Scanning jobs in your area…',
  'Matching jobs to your schedule…',
  'AI feed ready',
]

export default function DashboardPage() {
  const [userName, setUserName] = useState('there')
  const [activeTab, setActiveTab] = useState<FeedTab>('best_matches')
  const [savedJobs, setSavedJobs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [aiState, setAiState] = useState(0)
  const [jobs, setJobs] = useState<Record<FeedTab, JobMatch[]>>(FEED_SECTIONS as Record<FeedTab, JobMatch[]>)

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

        if (profile?.name) setUserName(profile.name)

        // Load saved job IDs
        const { data: applications } = await supabase
          .from('applications')
          .select('job_id')
          .eq('user_id', user.id)
          .eq('status', 'saved')

        if (applications) setSavedJobs(applications.map((a) => a.job_id))

        // Try to load real job matches from DB
        const { data: matchData } = await supabase
          .rpc('get_user_feed', { p_user_id: user.id, p_section: activeTab, p_limit: 20 })

        if (matchData && matchData.length > 0) {
          // Real data available — map to JobMatch shape
          // (for now fall through to mock)
        }
      }

      // Animate AI states
      let i = 0
      const interval = setInterval(() => {
        i++
        setAiState(i)
        if (i >= AI_GREETING_STATES.length - 1) {
          clearInterval(interval)
          setIsLoading(false)
        }
      }, 800)
    }

    loadDashboard()
  }, [])

  async function handleSave(jobId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (savedJobs.includes(jobId)) {
      setSavedJobs((prev) => prev.filter((id) => id !== jobId))
      await supabase
        .from('applications')
        .delete()
        .eq('user_id', user.id)
        .eq('job_id', jobId)
    } else {
      setSavedJobs((prev) => [...prev, jobId])
      await supabase.from('applications').upsert({
        user_id: user.id,
        job_id: jobId,
        status: 'saved',
      })
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-6 flex flex-col gap-1">
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-[#6B7280] font-medium"
        >
          {greeting}, {userName} 👋
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-[#111111]"
        >
          Your job matches
        </motion.h1>

        {/* AI state indicator */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.p
              key={aiState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-[#3B82F6] font-medium loading-text mt-1"
            >
              {AI_GREETING_STATES[aiState]}
            </motion.p>
          ) : (
            <motion.p
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-[#9CA3AF] mt-1"
            >
              Updated today · {MOCK_JOBS.length} jobs scanned
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 px-5 overflow-x-auto scrollbar-hide pb-2">
        {TABS.map(({ key, label, emoji }) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(key)}
            className={`flex-shrink-0 h-10 px-4 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === key
                ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-100'
                : 'bg-white text-[#374151] border border-gray-200'
            }`}
          >
            <span>{emoji}</span>
            <span>{label}</span>
          </motion.button>
        ))}
      </div>

      {/* Feed */}
      <div className="px-5 pt-4 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {isLoading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-5 h-48 animate-pulse border border-gray-100">
                    <div className="flex flex-col gap-3">
                      <div className="h-4 bg-gray-100 rounded-full w-24" />
                      <div className="h-6 bg-gray-100 rounded-full w-48" />
                      <div className="h-4 bg-gray-100 rounded-full w-32" />
                      <div className="h-12 bg-gray-50 rounded-xl" />
                    </div>
                  </div>
                ))}
                <p className="text-center text-sm text-[#9CA3AF] loading-text">
                  Matching jobs to your profile…
                </p>
              </div>
            ) : (
              <FeedSection
                title={TABS.find((t) => t.key === activeTab)?.label ?? ''}
                subtitle={
                  activeTab === 'best_matches' ? 'AI-ranked by how well they fit you' :
                  activeTab === 'new_near_you' ? 'Jobs within easy reach from your ZIP' :
                  'Employers known to hire teens fast'
                }
                jobs={jobs[activeTab]}
                savedJobs={savedJobs}
                onSave={handleSave}
                emptyState="New matches loading… check back tomorrow."
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
