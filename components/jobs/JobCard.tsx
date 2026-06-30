'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { JobMatch } from '@/lib/types/database'

interface JobCardProps {
  job: JobMatch
  onSave?: (id: string) => void
  isSaved?: boolean
  index?: number
}

function getMatchLabel(score: number): string {
  if (score >= 93) return 'Perfect Match'
  if (score >= 85) return 'Great Match'
  if (score >= 75) return 'Good Match'
  return 'Possible Match'
}

function MatchRing({ score }: { score: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
      <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={`mg${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop stopColor="#2563EB" />
            <stop offset="1" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(37,99,235,0.10)" strokeWidth="6" />
        <motion.circle
          cx="36" cy="36" r={r}
          fill="none"
          stroke={`url(#mg${score})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="match-gradient-text" style={{ fontSize: '17px', fontWeight: 800, lineHeight: 1 }}>
          {score}%
        </span>
      </div>
    </div>
  )
}

// Parse match_explanation into reason bullets
// Supports: "• reason1 · reason2" or plain string
function parseReasons(explanation: string): string[] {
  if (!explanation) return []
  // Try to split on '·' separator
  const parts = explanation
    .split('·')
    .map((s) => s.trim().replace(/^[•\-\*]\s*/, '').replace(/\.$/, ''))
    .filter(Boolean)
  return parts.slice(0, 4)
}

export function JobCard({ job, onSave, isSaved, index = 0 }: JobCardProps) {
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave?.(job.id)
    setSaving(false)
  }

  function handleApply() {
    window.open(job.apply_url, '_blank', 'noopener,noreferrer')
  }

  const matchLabel = getMatchLabel(job.match_score)
  const hiresfast = job.hiring_speed_score >= 80
  const reasons = parseReasons(job.match_explanation)
  const hasPay = job.salary_min || job.salary_max

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 }}
      className="card-elevated overflow-hidden flex flex-col"
    >
      {/* ── Match header ── */}
      <div
        className="px-5 pt-5 pb-4 flex items-start gap-4"
        style={{ borderBottom: '1px solid var(--et-border)' }}
      >
        <MatchRing score={job.match_score} />

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="match-gradient-text" style={{ fontSize: '13px', fontWeight: 800 }}>
              {matchLabel}
            </span>
            {hiresfast && (
              <span className="badge badge-amber" style={{ fontSize: '10px', padding: '2px 7px' }}>
                ⚡ Hires Fast
              </span>
            )}
          </div>
          <h3 style={{
            fontSize: '18px', fontWeight: 700, color: 'var(--et-ink)',
            letterSpacing: '-0.02em', lineHeight: 1.2,
          }}>
            {job.title}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: '2px', fontWeight: 500 }}>
            {job.company}
          </p>
        </div>
      </div>

      {/* ── Why this matches you ── */}
      <div
        className="px-5 py-3.5"
        style={{ borderBottom: '1px solid var(--et-border)' }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <div className="flex items-center justify-between">
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--et-placeholder)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Why this matches you
            </p>
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
                color: 'var(--et-placeholder)',
              }}
            >
              <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {/* Always show first reason, expand shows rest */}
        <div className="flex flex-col gap-1.5 mt-2">
          {(expanded ? reasons : reasons.slice(0, 2)).map((reason, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
                <circle cx="7" cy="7" r="6.5" fill="var(--et-green-light)" />
                <path d="M4.5 7L6.2 8.8L9.5 5.5" stroke="var(--et-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: '13px', color: 'var(--et-subtle)', lineHeight: 1.4 }}>{reason}</span>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {!expanded && reasons.length > 2 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setExpanded(true)}
              style={{
                background: 'none', border: 'none', padding: '4px 0 0',
                fontSize: '12px', color: 'var(--et-blue)', fontWeight: 600, cursor: 'pointer',
              }}
            >
              +{reasons.length - 2} more reasons
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Logistics + actions ── */}
      <div className="px-5 pt-3.5 pb-4 flex flex-col gap-3.5">
        <div className="flex flex-wrap gap-2">
          {job.distance_miles !== undefined && (
            <span className="badge badge-subtle">
              📍 {job.distance_miles < 1 ? 'Under 1 mi' : `${job.distance_miles.toFixed(1)} mi`}
            </span>
          )}
          <span className="badge badge-green">Ages {job.min_age}+</span>
          {job.experience_required === 'none' && (
            <span className="badge badge-blue">No experience needed</span>
          )}
          {hasPay ? (
            <span className="badge badge-subtle">${job.salary_min ?? job.salary_max}/hr</span>
          ) : (
            <span className="badge badge-subtle">Competitive pay</span>
          )}
        </div>

        <p style={{ fontSize: '12px', color: 'var(--et-placeholder)' }}>{job.location}</p>

        <div className="flex gap-2.5">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handleSave}
            disabled={saving}
            style={{
              height: 46, width: 52, borderRadius: 'var(--radius-md)', flexShrink: 0,
              border: isSaved ? '1.5px solid rgba(37,99,235,0.3)' : '1.5px solid var(--et-border-mid)',
              background: isSaved ? 'var(--et-blue-light)' : 'var(--et-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M4 3H14C14.55 3 15 3.45 15 4V15.5L9 12.8L3 15.5V4C3 3.45 3.45 3 4 3Z"
                fill={isSaved ? 'var(--et-blue)' : 'none'}
                stroke={isSaved ? 'var(--et-blue)' : 'var(--et-muted)'}
                strokeWidth="1.5" strokeLinejoin="round"
              />
            </svg>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleApply}
            className="btn-primary flex-1"
            style={{ height: 46, borderRadius: 'var(--radius-md)', fontSize: '14px' }}
          >
            Apply Now →
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
