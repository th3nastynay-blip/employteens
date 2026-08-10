'use client'

/**
 * EMPLOYTEENS — the unified feed
 *
 * Jobs and opportunities in one list. Jobs render with JobCard and its match
 * ring, because a job is genuinely scored against your schedule and commute.
 * Opportunities render with OpportunityCard and no ring, because scoring a
 * national competition against your bus route would be fake precision.
 *
 * Empty states matter more here than in most feeds. Our inventory is thin and
 * seasonal, so "nothing matches" is a normal Tuesday rather than an error, and
 * the copy has to give the teen a next move instead of a shrug.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { JobCard } from '@/components/jobs/JobCard'
import { OpportunityCard } from './OpportunityCard'
import { FeedChips } from './FeedChips'
import {
  applyChips, sortFeed, chipCounts, FEED_CHIPS,
  type FeedChip, type FeedItem,
} from '@/lib/feed-filters'

const PAGE = 30

export function UnifiedFeed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [active, setActive] = useState<FeedChip[]>([])
  const [hasPapers, setHasPapers] = useState<boolean | null>(null)
  const [age, setAge] = useState<number | null>(null)
  const [limit, setLimit] = useState(PAGE)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      let profileAge: number | null = null
      if (user) {
        const { data: p } = await supabase
          .from('users').select('age, has_working_papers').eq('id', user.id).single()
        profileAge = (p?.age as number) ?? null
        setAge(profileAge)
        setHasPapers((p?.has_working_papers as boolean | null) ?? null)
      }

      // Both statuses on purpose: 'inactive' here means out of season, not
      // dead, and a seasonal programme opening in February is worth showing in
      // August behind the "Starts soon" chip. Flagged rows stay excluded.
      let q = supabase
        .from('jobs')
        .select('*')
        .in('status', ['active', 'inactive'])
        .order('status', { ascending: true })
        .limit(400)

      if (profileAge) q = q.lte('min_age', profileAge)

      const { data } = await q
      setItems((data ?? []) as unknown as FeedItem[])
    } catch {
      /* feed renders its empty state */
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const counts = useMemo(() => chipCounts(items), [items])
  const filtered = useMemo(() => sortFeed(applyChips(items, active)), [items, active])
  const visible = filtered.slice(0, limit)

  function toggle(chip: FeedChip) {
    setLimit(PAGE)
    setActive((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]))
  }

  if (loading) return null

  return (
    <div>
      <FeedChips active={active} counts={counts} onToggle={toggle} />

      <div className="px-4 flex flex-col gap-2.5">
        {visible.length === 0 ? (
          <EmptyState active={active} age={age} onClear={() => setActive([])} />
        ) : (
          visible.map((item, i) =>
            item.kind === 'job' || item.kind === undefined ? (
              <JobCard key={item.id} job={item} index={i} />
            ) : (
              <OpportunityCard key={item.id} item={item} hasPapers={hasPapers === true} index={i} />
            ),
          )
        )}
      </div>

      {filtered.length > visible.length && (
        <div className="px-4 pt-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setLimit((l) => l + PAGE)}
            style={{
              width: '100%', height: 46, borderRadius: 'var(--radius-md)',
              background: 'var(--et-surface-2)', border: '1.5px solid var(--et-border-mid)',
              fontSize: '14px', fontWeight: 700, color: 'var(--et-subtle)', cursor: 'pointer',
            }}
          >
            Show {Math.min(PAGE, filtered.length - visible.length)} more
          </motion.button>
        </div>
      )}
    </div>
  )
}

/**
 * Thin inventory means empty is common, so the copy has to hand back a move.
 * "No results" is the version of this that makes a teen close the app.
 */
function EmptyState({ active, age, onClear }: { active: FeedChip[]; age: number | null; onClear: () => void }) {
  const hint = active.length === 1
    ? FEED_CHIPS.find((c) => c.id === active[0])?.emptyHint
    : active.length > 1
    ? 'Those filters together are too narrow. Try removing one.'
    : age !== null && age < 16
    ? 'Not much is open to you today, and that is the market, not you. Volunteering and competitions do not need working papers — try the No papers chip.'
    : 'Nothing matches right now. Seasonal programmes open through the year, so check Starts soon.'

  return (
    <div style={{ padding: '28px 8px', textAlign: 'center' }}>
      <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--et-ink)' }}>Nothing here right now</p>
      <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: 6, lineHeight: 1.5 }}>{hint}</p>
      {active.length > 0 && (
        <button
          onClick={onClear}
          style={{
            marginTop: 14, background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: 700, color: 'var(--et-blue)',
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
