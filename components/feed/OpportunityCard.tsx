'use client'

/**
 * EMPLOYTEENS — opportunity card
 *
 * Renders the non-job half of the unified feed: competitions, programs,
 * volunteering, org roles. Jobs keep using JobCard with its match ring — a job
 * is scored against your schedule and commute, which deserves that treatment.
 * An opportunity is not, so a match ring here would be fake precision.
 *
 * What earns space on the card, in order of what a teen actually needs:
 *   1. What it is and who runs it
 *   2. The age/papers reality — the reason most 14-year-olds stop looking
 *   3. Cost, stated or admitted unknown
 *   4. When it closes, or when it opens if it hasn't yet
 *   5. What it leaves you with
 */

import { motion } from 'framer-motion'
import { reasonLine, isVirtual, needsWorkingPapers, type FeedItem } from '@/lib/feed-filters'

const EVIDENCE_COPY: Record<string, string> = {
  reference: 'Ends with a reference',
  title: 'You hold a real title',
  award: 'A result you can name',
  income: 'Paid',
  hours: 'Logged hours',
  certificate: 'Certificate only',
}

function costLabel(item: FeedItem): { text: string; muted: boolean } {
  if (item.cost_unknown) return { text: 'Cost unconfirmed', muted: true }
  const cents = item.cost_cents as number | null | undefined
  if (cents === null || cents === 0) return { text: 'Free', muted: false }
  if (typeof cents === 'number') return { text: `$${Math.round(cents / 100)}`, muted: false }
  return { text: 'Cost unconfirmed', muted: true }
}

interface Props {
  item: FeedItem
  hasPapers?: boolean
  index?: number
  onOpen?: (item: FeedItem) => void
}

export function OpportunityCard({ item, hasPapers, index = 0, onOpen }: Props) {
  const cost = costLabel(item)
  const upcoming = item.status !== 'active'
  const evidence = EVIDENCE_COPY[String(item.evidence_kind ?? '')] ?? null

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onOpen?.(item)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'var(--et-surface)',
        border: '1px solid var(--et-border)',
        borderRadius: 'var(--radius-lg, 16px)',
        padding: '14px 14px 12px',
        cursor: 'pointer',
        opacity: upcoming ? 0.82 : 1,
      }}
    >
      <div className="flex gap-3">
        {item.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.logo_url as string}
            alt=""
            width={40}
            height={40}
            style={{ borderRadius: 10, flexShrink: 0, background: 'var(--et-ground)' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div
            style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'var(--et-ground)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, color: 'var(--et-muted)',
            }}
          >
            {String(item.company ?? '?').charAt(0)}
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--et-ink)', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            {item.title}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--et-muted)', marginTop: 1 }}>{item.company}</p>
        </div>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--et-subtle)', marginTop: 10, lineHeight: 1.4 }}>
        {reasonLine(item, { hasPapers })}
      </p>

      <div className="flex flex-wrap items-center gap-1.5" style={{ marginTop: 10 }}>
        {/* The papers line comes first for anyone who does not have them. It is
            the difference between "I can't work yet" and "I can start today". */}
        {!needsWorkingPapers(item) && hasPapers !== true && (
          <Pill text="No papers needed" tone="green" />
        )}
        <Pill text={isVirtual(item) ? 'Virtual' : String(item.location ?? '')} tone="plain" />
        <Pill text={cost.text} tone={cost.muted ? 'muted' : cost.text === 'Free' ? 'green' : 'plain'} />
        {evidence && <Pill text={evidence} tone={item.evidence_kind === 'certificate' ? 'muted' : 'blue'} />}
      </div>

      <p
        style={{
          fontSize: '12px', fontWeight: 700, marginTop: 10,
          color: upcoming ? 'var(--et-amber)' : 'var(--et-green)',
        }}
      >
        {upcoming ? (item.window_note as string) || 'Opens later in the year' : 'Open now'}
      </p>
    </motion.button>
  )
}

function Pill({ text, tone }: { text: string; tone: 'green' | 'blue' | 'muted' | 'plain' }) {
  const styles: Record<string, { bg: string; fg: string }> = {
    green: { bg: 'var(--et-green-light)', fg: 'var(--et-green)' },
    blue: { bg: 'var(--et-blue-light)', fg: 'var(--et-blue)' },
    muted: { bg: 'var(--et-surface-2)', fg: 'var(--et-placeholder)' },
    plain: { bg: 'var(--et-surface-2)', fg: 'var(--et-subtle)' },
  }
  const s = styles[tone]
  if (!text) return null
  return (
    <span
      style={{
        fontSize: '11px', fontWeight: 700, padding: '3px 8px',
        borderRadius: 999, background: s.bg, color: s.fg, whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  )
}
