'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { JobCard } from '@/components/jobs/JobCard'
import type { JobMatch, JobRow } from '@/lib/types/database'

export default function SavedJobsPage() {
  const [savedJobs, setSavedJobs] = useState<JobMatch[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // Fetch saved applications with the joined job data
      const { data } = await supabase
        .from('applications')
        .select('job_id, jobs (*)')
        .eq('user_id', user.id)
        .eq('status', 'saved')
        .order('created_at', { ascending: false })

      type RawApp = { job_id: string; jobs: unknown }
      const rows = (data ?? []) as unknown as RawApp[]
      const ids = rows.map((a) => a.job_id)
      setSavedIds(ids)

      const jobs: JobMatch[] = rows
        .filter((a) => a.jobs && typeof a.jobs === 'object')
        .map((a) => ({
          ...(a.jobs as JobRow),
          match_score: 0,
          match_explanation: '',
        }))
      setSavedJobs(jobs)
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
        <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--et-ink)' }}>
          Saved Jobs
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--et-muted)', marginTop: 4 }}>
          {loading ? 'Loading…' : `${savedJobs.length} job${savedJobs.length !== 1 ? 's' : ''} saved`}
        </p>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="text-4xl">🔖</div>
            <p style={{ color: 'var(--et-placeholder)', fontSize: '14px' }}>Loading saved jobs…</p>
          </div>
        ) : savedJobs.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span style={{ fontSize: '48px' }}>📭</span>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--et-subtle)' }}>No saved jobs yet</p>
              <p style={{ fontSize: '14px', color: 'var(--et-placeholder)', marginTop: 4 }}>
                Hit save on any job in your feed
              </p>
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
                index={i}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
