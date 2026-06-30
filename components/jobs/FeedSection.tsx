'use client'

import { motion } from 'framer-motion'
import { JobCard } from './JobCard'
import type { JobMatch } from '@/lib/types/database'

interface FeedSectionProps {
  title: string
  subtitle: string
  jobs: JobMatch[]
  savedJobs: string[]
  onSave: (id: string) => void
  emptyState?: string
}

export function FeedSection({ title, subtitle, jobs, savedJobs, onSave, emptyState }: FeedSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-bold text-[#111111]">{title}</h2>
        <p className="text-sm text-[#6B7280]">{subtitle}</p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-3 border border-gray-100">
          <span className="text-4xl">🔍</span>
          <p className="text-[#6B7280] text-sm text-center">{emptyState ?? 'Scanning for matches…'}</p>
        </div>
      ) : (
        <motion.div className="flex flex-col gap-4">
          {jobs.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <JobCard
                job={job}
                onSave={onSave}
                isSaved={savedJobs.includes(job.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
