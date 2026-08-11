'use client'

/**
 * EMPLOYTEENS — /extracurriculars
 *
 * The dedicated EC surface. Three things stacked, in the order a teen needs
 * them rather than the order the data arrives:
 *
 *   1. CLOSING SOON — anything with a real deadline inside ~60 days. Right now
 *      that surfaces BGIC at 28 August. Urgency first, always.
 *   2. THE LIST — filtered, with cost and papers stated on every card.
 *   3. THE CALENDAR — the twelve-month view. This is the piece no competitor
 *      has, and with 9 of 31 entries out of season in August it is a third of
 *      the inventory that would otherwise be invisible.
 *
 * Uses the redesign layer: Outfit display face, ghosted numerals on section
 * headers, pills for metadata, the blue→purple gradient on the hero.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OpportunityCard } from '@/components/feed/OpportunityCard'
import { buildCalendar, groupByOpeningMonth } from '@/lib/opportunity-calendar'
import { OPPORTUNITY_SOURCES } from '@/lib/jobs/opportunity-sources'
import type { FeedItem } from '@/lib/feed-filters'

type Cat = 'all' | 'competition' | 'program' | 'volunteer' | 'internship' | 'org_role'

const CATS: { id: Cat; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'competition', label: 'Competitions' },
  { id: 'program', label: 'Programs' },
  { id: 'volunteer', label: 'Volunteering' },
  { id: 'internship', label: 'Internships' },
  { id: 'org_role', label: 'Org roles' },
]

export default function ExtracurricularsPage() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [cat, setCat] = useState<Cat>('all')
  const [freeOnly, setFreeOnly] = useState(false)
  const [hasPapers, setHasPapers] = useState<boolean | null>(null)
  const [grade, setGrade] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * Time is pinned once, on the client, after mount.
   *
   * Calling Date.now() during render is impure and React's lint rules are right
   * to reject it — but the real bug it prevents here is a hydration mismatch.
   * A deadline 18 days out on the server can be 17 on the client if the render
   * straddles midnight, and "18 days left" flipping to "17" mid-paint is
   * exactly the sort of thing that makes a countdown untrustworthy.
   */
  const [now, setNow] = useState(0)
  const month = now === 0 ? 1 : new Date(now).getMonth() + 1

  const load = useCallback(async () => {
    setNow(Date.now())
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase
          .from('users').select('has_working_papers, school_grade').eq('id', user.id).single()
        setHasPapers((p?.has_working_papers as boolean | null) ?? null)
        const g = parseInt(String(p?.school_grade ?? ''), 10)
        if (!Number.isNaN(g)) setGrade(g)
      }
      // Both statuses: 'inactive' here means out of season, not dead, and the
      // whole point of this page is showing what is coming.
      const { data } = await supabase
        .from('jobs').select('*').eq('source', 'opportunity')
        .in('status', ['active', 'inactive']).limit(300)
      setItems((data ?? []) as unknown as FeedItem[])
    } catch { /* empty state renders */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const filtered = useMemo(() => items.filter((i) => {
    if (cat !== 'all' && i.kind !== cat) return false
    if (freeOnly && !(i.cost_cents === null || i.cost_cents === 0)) return false
    // Grade eligibility is a hard gate, not a preference. This is the guard
    // that stops a 7th grader being shown a grades 11-12 programme.
    if (grade !== null) {
      const min = i.min_grade as number | null
      const max = i.max_grade as number | null
      if (typeof min === 'number' && grade < min) return false
      if (typeof max === 'number' && grade > max) return false
    }
    return true
  }), [items, cat, freeOnly, grade])

  /**
   * The twelve-month view is built from the SEED, not the database.
   *
   * `activeMonths` deliberately has no column — see add_window_note.sql. The
   * database stores prose ("opens around May") because organisers publish
   * confidently wrong dates; the month arrays that drive the calendar live in
   * lib/jobs/opportunity-sources.ts, which is the source of truth for
   * recurrence. So the cards come from Supabase and the calendar comes from
   * the seed, and they are joined on slug.
   */
  const monthGroups = useMemo(() => {
    const eligible = OPPORTUNITY_SOURCES.filter((s) => {
      if (cat !== 'all' && s.kind !== cat) return false
      if (grade !== null) {
        if (typeof s.min_grade === 'number' && grade < s.min_grade) return false
        if (typeof s.max_grade === 'number' && grade > s.max_grade) return false
      }
      return true
    })
    const built = buildCalendar(eligible.map((s) => ({
      slug: s.slug, title: s.title, org: s.org,
      activeMonths: s.activeMonths ?? [],
      windowNote: s.windowNote, kind: s.kind, tags: s.tags,
    })), month)
    return groupByOpeningMonth(built, month)
  }, [cat, grade, month])

  const open = filtered.filter((i) => i.status === 'active')
  const upcoming = filtered.filter((i) => i.status !== 'active')

  // Anything with a genuine dated deadline inside 60 days.
  const closingSoon = useMemo(() => open
    .map((i) => ({
      item: i,
      days: i.deadline
        ? Math.ceil((new Date(String(i.deadline)).getTime() - now) / 86_400_000)
        : null,
    }))
    .filter((x): x is { item: FeedItem; days: number } =>
      x.days !== null && x.days > 0 && x.days <= 60)
    .sort((a, b) => a.days - b.days), [open, now])

  const virtualCount = filtered.filter((i) => i.delivery === 'virtual').length

  if (loading) {
    return (
      <div className="px-5 pt-safe-header">
        <div className="skeleton" style={{ height: 120, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 88, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 88 }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full" style={{ paddingBottom: 32 }}>

      {/* ── Hero ── */}
      <div className="px-5 pt-safe-header pb-4 rise">
        <p className="numbered-eyebrow">EXTRACURRICULARS</p>
        <h1 className="display display-xl" style={{ marginTop: 4 }}>
          Things worth<br />your time
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: 8, lineHeight: 1.5, maxWidth: 320 }}>
          Competitions, programs and volunteering. Every one checked for what it costs,
          who it is open to, and what you actually walk away with.
        </p>

        <div className="flex flex-wrap gap-1.5" style={{ marginTop: 12 }}>
          <span className="pill pill-green">{open.length} open now</span>
          {upcoming.length > 0 && <span className="pill pill-amber">{upcoming.length} coming later</span>}
          {virtualCount > 0 && <span className="pill pill-blue">{virtualCount} virtual</span>}
        </div>
      </div>

      {/* ── Closing soon ── */}
      {closingSoon.length > 0 && (
        <section className="rise rise-1" style={{ marginBottom: 8 }}>
          <div className="px-5">
            <p className="section-label" style={{ marginBottom: 8 }}>
              <span className="status-dot status-closing" />Closing soon
            </p>
          </div>
          <div
            className="flex gap-2.5 px-5 pb-1 overflow-x-auto scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            {closingSoon.map(({ item, days }) => (
              <div key={item.id} className="grad-border press" style={{ flexShrink: 0, width: 232, padding: 14 }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--et-amber)' }}>
                  {days} {days === 1 ? 'day' : 'days'} left
                </p>
                <p className="display display-md" style={{ marginTop: 4 }}>{String(item.title)}</p>
                <p style={{ fontSize: '12px', color: 'var(--et-muted)', marginTop: 2 }}>{String(item.company)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Filters ── */}
      <div
        className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            aria-pressed={cat === c.id}
            className={`fchip press${cat === c.id ? ' fchip-on' : ''}`}
          >
            {c.label}
          </button>
        ))}
        {/* Cost stays green rather than joining the gradient. Money is the one
            filter that isn't a taste preference — for a lot of these families
            it's the whole decision, and it should not look like the others. */}
        <button
          onClick={() => setFreeOnly((v) => !v)}
          aria-pressed={freeOnly}
          className="fchip press"
          style={freeOnly ? {
            background: 'var(--et-green)', color: '#fff', borderColor: 'transparent',
          } : undefined}
        >
          Free only
        </button>
      </div>

      {/* ── Open now ── */}
      <section className="px-4">
        <div className="numbered px-1" data-n="01" style={{ marginBottom: 10 }}>
          <p className="numbered-eyebrow">OPEN NOW</p>
          <h2 className="display display-lg">You can apply today</h2>
        </div>

        {open.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--et-muted)', padding: '12px 4px 20px', lineHeight: 1.5 }}>
            Nothing in this category is open right now. That is seasonality, not a dead end —
            check what is coming below.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {open.map((i, n) => (
              <OpportunityCard key={i.id} item={i} hasPapers={hasPapers === true} index={n} />
            ))}
          </div>
        )}
      </section>

      {/* ── Coming later ── */}
      {upcoming.length > 0 && (
        <section className="px-4" style={{ marginTop: 28 }}>
          <div className="numbered px-1" data-n="02" style={{ marginBottom: 10 }}>
            <p className="numbered-eyebrow">NOT OPEN YET</p>
            <h2 className="display display-lg">Worth knowing about</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {upcoming.map((i, n) => (
              <OpportunityCard key={i.id} item={i} hasPapers={hasPapers === true} index={n} />
            ))}
          </div>
        </section>
      )}

      {/* ── The calendar ──
          The thing EC Database has no version of. In August, 9 of 31 entries
          are out of season — a third of the inventory that would otherwise be
          invisible until it was already too late to apply. */}
      {monthGroups.length > 0 && (
        <section className="px-4" style={{ marginTop: 32 }}>
          <div className="numbered px-1" data-n="03" style={{ marginBottom: 14 }}>
            <p className="numbered-eyebrow">THE CALENDAR</p>
            <h2 className="display display-lg">The whole year</h2>
            <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: 6, lineHeight: 1.5, maxWidth: 320 }}>
              Knowing in August that hospital volunteer intake opens in February is the
              difference between applying and missing it by a year.
            </p>
          </div>

          <div className="flex flex-col" style={{ gap: 18 }}>
            {monthGroups.map((g, gi) => (
              <div key={g.month} className={`rise rise-${Math.min(gi + 1, 5)}`}>
                <div className="flex items-baseline gap-2" style={{ marginBottom: 8, paddingLeft: 2 }}>
                  <span
                    className="display"
                    style={{ fontSize: '15px', fontWeight: 700, color: 'var(--et-ink)' }}
                  >
                    {g.label}
                  </span>
                  <span style={{ flex: 1, height: 1, background: 'var(--et-border)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--et-placeholder)', fontWeight: 600 }}>
                    {g.items.length}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {g.items.map((it) => (
                    <div
                      key={it.slug}
                      className="card press"
                      style={{ padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <span
                        className={`status-dot ${
                          it.state === 'closing_soon' ? 'status-closing'
                            : it.state === 'open' ? 'status-open' : 'status-upcoming'
                        }`}
                        style={{ flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          className="display"
                          style={{
                            fontSize: '13.5px', fontWeight: 600, color: 'var(--et-ink)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {it.title}
                        </p>
                        <p style={{ fontSize: '11.5px', color: 'var(--et-muted)', marginTop: 1 }}>
                          {it.timing}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '11px', color: 'var(--et-placeholder)', marginTop: 16, paddingLeft: 4, lineHeight: 1.5 }}>
            Timing is the recurring pattern, not a promised date. Organisers move their
            own deadlines, so we show the cycle and re-check the link.
          </p>
        </section>
      )}

      {filtered.length === 0 && (
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <p className="display display-md">Nothing matches</p>
          <p style={{ fontSize: '13px', color: 'var(--et-muted)', marginTop: 6, lineHeight: 1.5 }}>
            {grade !== null
              ? `We filter by your grade, so some programmes are hidden because they are not open to grade ${grade}.`
              : 'Try a different category, or turn off Free only.'}
          </p>
        </div>
      )}
    </div>
  )
}
