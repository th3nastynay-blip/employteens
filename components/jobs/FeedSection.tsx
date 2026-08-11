'use client'

import { useState } from 'react'
import { JobCard } from './JobCard'
import { JobSheet } from './JobSheet'
import { openApplication } from '@/lib/jobs/apply'
import { fitFactors } from '@/lib/ai/match-engine'
import type { JobMatch, UserProfile, JobRow } from '@/lib/types/database'

interface FeedSectionProps {
  jobs: JobMatch[]
  savedJobs: string[]
  onSave: (id: string) => void
  emptyState?: string
  /** Somewhere to actually go, when the empty state has a real next step. */
  emptyAction?: { label: string; href: string }
  /**
   * Needed to compute fit factors, which are per-teen by definition. Without
   * it the cards render with no fit ring rather than falling back to a
   * percentage we cannot justify — see fitFactors() in match-engine.
   */
  profile?: UserProfile | null
}

export function FeedSection({ jobs, savedJobs, onSave, emptyState, emptyAction, profile }: FeedSectionProps) {
  const [open, setOpen] = useState<JobMatch | null>(null)
  const openFit = open && profile ? fitFactors(profile, open as unknown as JobRow) : undefined
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
        <p style={{ fontSize: '14px', color: 'var(--et-muted)', lineHeight: 1.55, maxWidth: 340 }}>
          {emptyState ?? 'Scanning for matches in your area…'}
        </p>
        {emptyAction && (
          <a
            href={emptyAction.href}
            className="press"
            style={{
              marginTop: 4, height: 44, padding: '0 20px', borderRadius: 13,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, var(--et-match-from), var(--et-match-to))',
              color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '14.5px', textDecoration: 'none',
            }}
          >
            {emptyAction.label}
          </a>
        )}
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
          fit={profile ? fitFactors(profile, job as unknown as JobRow) : undefined}
          onOpen={setOpen}
        />
      ))}

      <JobSheet
        job={open}
        fit={openFit}
        isSaved={open ? savedJobs.includes(open.id) : false}
        onSave={onSave}
        onApply={(j) => { void openApplication(j) }}
        onClose={() => setOpen(null)}
      />
    </div>
  )
}
