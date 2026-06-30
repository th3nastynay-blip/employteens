'use client'

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useRef, useState } from 'react'
import type { JobMatch } from '@/lib/types/database'
import { formatDistance, getMatchLabel, getHiringSpeedLabel } from '@/lib/utils/format'

interface JobCardProps {
  job: JobMatch
  onSave?: (id: string) => void
  onDismiss?: (id: string) => void
  isSaved?: boolean
}

export function JobCard({ job, onSave, onDismiss, isSaved }: JobCardProps) {
  const { label: matchLabel, color: matchColor } = getMatchLabel(job.match_score)
  const [swiped, setSwiped] = useState<'left' | 'right' | null>(null)

  function handleApply() {
    window.open(job.apply_url, '_blank', 'noopener,noreferrer')
  }

  function handleSave() {
    onSave?.(job.id)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: swiped ? 0 : 1, x: swiped === 'right' ? 120 : swiped === 'left' ? -120 : 0 }}
      className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex flex-col gap-3">
        {/* Match + badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 rounded-full px-3 py-1 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              <span className={`text-xs font-bold ${matchColor}`}>
                {job.match_score}% match
              </span>
            </div>
            {job.min_age <= 14 && (
              <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                Ages 14+
              </span>
            )}
            {job.min_age === 15 && (
              <span className="bg-green-50 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                Ages 15+
              </span>
            )}
          </div>
          {job.hiring_speed_score >= 80 && (
            <span className="bg-orange-50 text-orange-600 text-xs font-semibold px-2 py-1 rounded-full">
              ⚡ Hires Fast
            </span>
          )}
        </div>

        {/* Title + company */}
        <div>
          <h3 className="text-xl font-bold text-[#111111] leading-tight">{job.title}</h3>
          <p className="text-[#6B7280] text-sm font-medium mt-0.5">{job.company}</p>
        </div>

        {/* Location + distance */}
        <div className="flex items-center gap-1.5 text-sm text-[#6B7280]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1C4.79 1 3 2.79 3 5C3 8.5 7 13 7 13C7 13 11 8.5 11 5C11 2.79 9.21 1 7 1ZM7 6.5C6.17 6.5 5.5 5.83 5.5 5C5.5 4.17 6.17 3.5 7 3.5C7.83 3.5 8.5 4.17 8.5 5C8.5 5.83 7.83 6.5 7 6.5Z" fill="#9CA3AF" />
          </svg>
          <span>{job.location}</span>
          {job.distance_miles !== undefined && (
            <span className="text-[#9CA3AF]">· {formatDistance(job.distance_miles)}</span>
          )}
        </div>

        {/* Match explanation */}
        <p className="text-sm text-[#374151] bg-blue-50/60 rounded-xl px-3 py-2 leading-relaxed">
          {job.match_explanation}
        </p>
      </div>

      {/* Score bars */}
      <div className="px-5 pb-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Teen Friendly', score: job.teen_friendly_score },
          { label: 'Flexibility', score: job.schedule_flexibility_score },
          { label: 'Quick Hire', score: job.hiring_speed_score },
        ].map(({ label, score }) => (
          <div key={label} className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-xs text-[#9CA3AF]">{label}</span>
              <span className="text-xs font-semibold text-[#374151]">{score}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                className="h-full bg-[#3B82F6] rounded-full"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 flex gap-3">
        <button
          onClick={handleSave}
          className={`flex-1 h-12 rounded-2xl font-semibold text-sm transition-all border ${
            isSaved
              ? 'bg-blue-50 text-[#3B82F6] border-blue-100'
              : 'bg-white text-[#374151] border-gray-200 hover:border-blue-200'
          }`}
        >
          {isSaved ? '✓ Saved' : '🔖 Save'}
        </button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleApply}
          className="flex-2 flex-grow-[2] h-12 rounded-2xl font-semibold text-sm bg-[#3B82F6] text-white shadow-md shadow-blue-100"
        >
          Apply Now →
        </motion.button>
      </div>
    </motion.div>
  )
}
