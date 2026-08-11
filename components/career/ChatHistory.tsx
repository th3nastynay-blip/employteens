'use client'

/**
 * EMPLOYTEENS — saved chat drawer
 *
 * Slides in from the left, which is where every chat product puts history, and
 * matching that convention is worth more than any originality here would be.
 *
 * DELETE IS TWO TAPS, NOT ONE, AND NOT A MODAL. One tap deletes a twenty-minute
 * resume session by accident; a modal for every delete is heavy and trains
 * people to dismiss dialogs without reading. So the row itself becomes the
 * confirmation: tap the bin, the row turns red and offers "Delete" or "Keep",
 * and it resets if you tap anything else. Destructive, reversible up to the
 * moment it is not, and it never covers the screen.
 *
 * Empty state says what will appear here rather than "no conversations", so a
 * first-time visitor learns the feature exists instead of reading a null state.
 */

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  listConversations,
  deleteConversation,
  whenLabel,
  type Conversation,
} from '@/lib/ai/coach-store'

interface Props {
  open: boolean
  onClose: () => void
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  /** Bumped by the parent after a save so the list refetches. */
  refreshKey: number
}

export function ChatHistory({ open, onClose, activeId, onSelect, onNew, refreshKey }: Props) {
  const [items, setItems] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setItems(await listConversations())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
    setConfirmId(null)
  }, [open, refreshKey, load])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function remove(id: string) {
    // Optimistic: the row goes immediately and comes back on failure. A spinner
    // on a delete makes the app feel slower than the network actually is.
    setItems((prev) => prev.filter((c) => c.id !== id))
    setConfirmId(null)
    const ok = await deleteConversation(id)
    if (!ok) void load()
    else if (id === activeId) onNew()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,17,21,0.42)', backdropFilter: 'blur(3px)' }}
          />

          <motion.aside
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            role="dialog" aria-modal="true" aria-label="Saved chats"
            style={{
              position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 201,
              width: 'min(84vw, 330px)',
              background: 'var(--et-surface)',
              display: 'flex', flexDirection: 'column',
              boxShadow: '8px 0 40px rgba(0,0,0,0.16)',
            }}
          >
            <div
              className="pt-safe-header"
              style={{ padding: '0 16px 12px', borderBottom: '1px solid var(--et-border)', flexShrink: 0 }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <h2 className="display" style={{ fontSize: '17px' }}>Your chats</h2>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="press"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="var(--et-muted)" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <button
                onClick={() => { onNew(); onClose() }}
                className="press"
                style={{
                  width: '100%', height: 42, borderRadius: 12, cursor: 'pointer',
                  background: 'var(--et-ink)', border: 'none', color: '#fff',
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
                New chat
              </button>
            </div>

            <div className="scrollbar-hide" style={{ flex: 1, overflowY: 'auto', padding: '10px 12px calc(20px + env(safe-area-inset-bottom))' }}>
              {loading ? (
                <div className="flex flex-col gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 52, borderRadius: 12 }} />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div style={{ padding: '28px 8px', textAlign: 'center' }}>
                  <p className="display" style={{ fontSize: '15px', marginBottom: 6 }}>Nothing saved yet</p>
                  <p style={{ fontSize: '12.5px', color: 'var(--et-muted)', lineHeight: 1.55 }}>
                    Every conversation you start gets kept here, so you can come back to a
                    resume or an interview prep later instead of starting over.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {items.map((c) => {
                    const isActive = c.id === activeId
                    const confirming = c.id === confirmId

                    if (confirming) {
                      return (
                        <div
                          key={c.id}
                          style={{
                            borderRadius: 12, padding: '10px 12px',
                            background: 'rgba(220,38,38,0.05)',
                            border: '1px solid rgba(220,38,38,0.25)',
                          }}
                        >
                          <p style={{ fontSize: '12.5px', color: '#B91C1C', fontWeight: 600, marginBottom: 8 }}>
                            Delete this chat?
                          </p>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => remove(c.id)}
                              className="press"
                              style={{
                                flex: 1, height: 32, borderRadius: 9, border: 'none',
                                background: '#DC2626', color: '#fff', fontSize: '12px',
                                fontWeight: 700, cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="press"
                              style={{
                                flex: 1, height: 32, borderRadius: 9,
                                border: '1px solid var(--et-border-mid)', background: 'var(--et-surface)',
                                color: 'var(--et-subtle)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              Keep
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={c.id}
                        className="flex items-center"
                        style={{
                          borderRadius: 12,
                          background: isActive ? 'var(--et-blue-light)' : 'transparent',
                          border: `1px solid ${isActive ? 'rgba(37,99,235,0.22)' : 'transparent'}`,
                        }}
                      >
                        <button
                          onClick={() => { onSelect(c.id); onClose() }}
                          style={{
                            flex: 1, minWidth: 0, textAlign: 'left', cursor: 'pointer',
                            background: 'none', border: 'none', padding: '10px 4px 10px 12px',
                          }}
                        >
                          <span
                            style={{
                              display: 'block', fontSize: '13.5px', fontWeight: isActive ? 700 : 500,
                              color: 'var(--et-ink)', whiteSpace: 'nowrap',
                              overflow: 'hidden', textOverflow: 'ellipsis',
                            }}
                          >
                            {c.title}
                          </span>
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--et-placeholder)', marginTop: 2 }}>
                            {whenLabel(c.updated_at)}
                          </span>
                        </button>

                        <button
                          onClick={() => setConfirmId(c.id)}
                          aria-label={`Delete ${c.title}`}
                          className="press"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '10px 12px', lineHeight: 0, flexShrink: 0,
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M3 4.5h10M6.5 4.5V3.2h3v1.3M4.4 4.5l.6 8.3h6l.6-8.3" stroke="var(--et-placeholder)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
