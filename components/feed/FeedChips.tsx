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
            className={`fchip${on ? ' fchip-on' : ''}${empty ? ' fchip-empty' : ''}`}
          >
            {chip.label}
            <span className="fchip-count">{n}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
