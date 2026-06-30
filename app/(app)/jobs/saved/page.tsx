'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { JobCard } from '@/components/jobs/JobCard'
import { MOCK_JOBS } from '@/lib/data/mock-jobs'
import type { JobMatch } from '@/lib/types/database'

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<JobMatch[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('applications')
        .select('job_id')
        .eq('user_id', user.id)
        .eq('status', 'saved')

      const ids = data?.map((a) => a.job_id) ?? []
      setSavedIds(ids)

      // Filter mock jobs by saved IDs (prod: fetch from jobs table)
      const saved = MOCK_JOBS.filter((j) => ids.includes(j.id))
      setSavedJobs(saved)
      setLoading(false)
    }
    load()
  }, [])

  async function handleUnsave(jobId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSavedIds((prev) => prev.filter((id) => id !== jobId))
    setSavedJobs((prev) => prev.filter((j) => j.id !== jobId))

    await supabase
      .from('applications')
      .delete()
      .eq('user_id', user.id)
      .eq('job_id', jobId)
  }

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-[#111111]">Saved Jobs</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          {savedJobs.length} job{savedJobs.length !== 1 ? 's' : ''} saved
        </p>
      </div>

      <div className="px-5 pb-4 flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="text-4xl loading-text">🔖</div>
            <p className="text-[#9CA3AF] text-sm">Loading saved jobs…</p>
          </div>
        ) : savedJobs.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="text-5xl">📭</span>
            <div>
              <p className="font-semibold text-[#374151]">No saved jobs yet</p>
              <p className="text-sm text-[#9CA3AF] mt-1">Hit save on any job in your feed</p>
            </div>
          </div>
        ) : (
          savedJobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <JobCard
                job={job}
                onSave={handleUnsave}
                isSaved={true}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
