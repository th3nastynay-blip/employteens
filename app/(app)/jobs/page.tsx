'use client'

/**
 * EMPLOYTEENS — /jobs, the unified feed
 *
 * One list of everything a teen can do: jobs, competitions, programs,
 * volunteering, org roles. Kind is a filter chip, never a tab.
 *
 * This route also fixes a dangling link — RungCard's "find something" action
 * pointed at /jobs, which did not exist until now. Only /jobs/saved did.
 */

import { motion } from 'framer-motion'
import { UnifiedFeed } from '@/components/feed/UnifiedFeed'

export default function JobsPage() {
  return (
    <div className="flex flex-col min-h-full pb-nav">
      <div className="px-5 pt-safe-header pb-4">
        <motion.h1
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: '26px',
            fontWeight: 800,
            color: 'var(--et-ink)',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
          }}
        >
          Everything you can do
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
          style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: 4, lineHeight: 1.45 }}
        >
          Jobs, programs, competitions and volunteering. Filter to what fits.
        </motion.p>
      </div>

      <UnifiedFeed />

      <div style={{ height: 24 }} />
    </div>
  )
}
