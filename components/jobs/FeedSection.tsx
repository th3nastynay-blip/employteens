'use client'

import { motion } from 'framer-motion'
import { JobCard } from './JobCard'
import type { JobMatch } from '@/lib/types/database'

interface FeedSectionProps {
  jobs: JobMatch[]
  savedJobs: string[]
  onSave: (id: string) => void
  emptyState?: string
}

export function FeedSection({ jobs, savedJobs, onSave, emptyState }: FeedSectionProps) {
  if (jobs.length === 0) {
    return (
      <div
        className="card flex flex-col items-center gap-3 px-6 py-12"
        style={{ textAlign: 'center' }}
      >
        <div
          style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)',
            background: 'var(--et-blue-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px',
          }}
        >
          🔍
        </div>
        <p style={{ fontSize: '14px', color: 'var(--et-muted)', lineHeight: 1.5 }}>
          {emptyState ?? 'Scanning for matches in your area…'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {jobs.map((job, i) => (
        <JobCard
          key={job.id}
          job={job}
          onSave={onSave}
          isSaved={savedJobs.includes(job.id)}
          index={i}
        />
      ))}
    </div>
  )
}
