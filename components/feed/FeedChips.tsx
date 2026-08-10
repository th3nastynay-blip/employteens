'use client'

/**
 * EMPLOYTEENS — feed filter chips
 *
 * Kind is a filter, never a navigation destination. One list, six chips.
 *
 * Every chip carries its live count, and a chip that would empty the list is
 * dimmed rather than hidden. Hiding it teaches a teen the app is small; showing
 * "Paid 0" tells them the truth and keeps the control where they expect it.
 */

import { motion } from 'framer-motion'
import { FEED_CHIPS, type FeedChip } from '@/lib/feed-filters'

interface Props {
  active: FeedChip[]
  counts: Record<FeedChip, number>
  onToggle: (chip: FeedChip) => void
}

export function FeedChips({ active, counts, onToggle }: Props) {
  return (
    <div
      className="flex gap-2 px-5 pb-3 overflow-x-auto scrollbar-hide"
      style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      role="group"
      aria-label="Filter listings"
    >
      {FEED_CHIPS.map((chip) => {
        const on = active.includes(chip.id)
        const n = counts[chip.id] ?? 0
        const empty = n === 0 && !on
        return (
          <motion.button
            key={chip.id}
            whileTap={{ scale: 0.96 }}
            onClick={() => onToggle(chip.id)}
            aria-pressed={on}
            style={{
              flexShrink: 0,
              height: 36,
              padding: '0 14px',
              borderRadius: 999,
              fontSize: '13px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              background: on ? 'var(--et-blue)' : 'var(--et-surface)',
              color: on ? '#fff' : empty ? 'var(--et-placeholder)' : 'var(--et-subtle)',
              border: `1.5px solid ${on ? 'var(--et-blue)' : 'var(--et-border-mid)'}`,
              opacity: empty ? 0.55 : 1,
            }}
          >
            {chip.label}
            <span style={{ marginLeft: 6, fontWeight: 600, opacity: 0.75 }}>{n}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
