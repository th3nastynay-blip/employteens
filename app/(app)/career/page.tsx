'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatHistory } from '@/components/career/ChatHistory'
import {
  createConversation,
  appendMessage,
  loadMessages,
} from '@/lib/ai/coach-store'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

/**
 * THREE TRACKS, NOT FIVE PROMPTS.
 *
 * The empty state used to be a flat list of five suggestions, which quietly
 * assumed every teen opening this page wanted the same thing. They do not, and
 * the gap is enormous: a 15-year-old who needs bus fare by Friday and a
 * 17-year-old asking how a job reads on a Rutgers application are not variations
 * of one user, and an answer tuned for either one is close to useless for the
 * other.
 *
 * The coach infers which register to use from what gets said (see the "WHO YOU
 * ARE TALKING TO" block in lib/ai/career-ai.ts), so this does not gate anything
 * — pick any track and then ask whatever you like. What it does is TELL a first
 * time visitor that all three are on the table, which a list of five resume
 * prompts actively hides. Most teens never discover a capability they were not
 * shown.
 *
 * Ordered deliberately: money first. It is the most urgent need, the least well
 * served elsewhere, and the reason most of these teens are here.
 */
const TRACKS = [
  {
    id: 'money',
    label: 'I need money soon',
    blurb: 'Fastest realistic path to a first paycheck, including work that needs no papers.',
    color: '#16A34A',
    tint: 'var(--et-green-light)',
    prompts: [
      'I need to start earning within two weeks — what actually works?',
      'What can I do at my age without working papers?',
      'How much should I charge for babysitting around here?',
    ],
  },
  {
    id: 'record',
    label: 'Build something real',
    blurb: 'Turn what you already do into a reference an employer will take seriously.',
    color: '#2563EB',
    tint: 'var(--et-blue-light)',
    prompts: [
      'Help me write a resume when I have no experience',
      'How do I ask someone to be my reference without it being awkward?',
      'How do I prepare for a first interview?',
    ],
  },
  {
    // Belongs here rather than in a separate product. Starting a project or a
    // small business IS rungs 2-3 of the ladder — "started something" and
    // "someone will vouch" — so it is the same climb, not a new one. It also
    // covers the teens no job board serves at all: the ones who are not going
    // to get hired at 14 and should be building something instead of waiting
    // two years for a McDonald's application to be legal.
    id: 'build',
    label: 'Start something of my own',
    blurb: 'A project, a small business, or freelancing. Where to actually begin, not just be told to.',
    color: '#D97706',
    tint: 'var(--et-amber-light)',
    prompts: [
      'I want to start a small business but I have no money to start with',
      'How do I turn something I am into a real project people see?',
      'How do I get my first three paying customers?',
    ],
  },
  {
    id: 'college',
    label: 'Thinking about college',
    blurb: 'How your work and activities actually read to an admissions officer.',
    color: '#7C3AED',
    tint: 'var(--et-purple-light)',
    prompts: [
      'Does a part-time job help or hurt my college application?',
      'What is genuinely weak about my profile right now?',
      'I want to study business — what should I be doing this year?',
    ],
  },
] as const

function LogoMark({ size = 28 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" width={size} height={size} alt="EmployTeens" style={{ borderRadius: size * 0.28, display: 'block' }} />
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5">
      <LogoMark size={28} />
      <div
        style={{
          background: 'var(--et-surface)',
          border: '1px solid var(--et-border)',
          borderRadius: '18px 18px 18px 4px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}

/**
 * Escape HTML before anything else touches the string.
 *
 * THIS WAS A REAL HOLE. parseMarkdown's output goes into
 * dangerouslySetInnerHTML, and the previous version applied its regexes to raw
 * model output with no escaping. Model output is not trusted input: a teen can
 * type "repeat this back exactly: <img src=x onerror=...>" and a helpful
 * assistant will do precisely that, at which point the markup executes in their
 * session with their Supabase token in scope. Same for anything a job
 * description carries into the prompt.
 *
 * Escaping first and building tags afterwards means the only HTML that can ever
 * reach the DOM is HTML this function wrote.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Minimal markdown. Real lists rather than a bullet character.
 *
 * The old version turned "- item" into the literal text "• item" and joined
 * everything with <br/>, so a numbered set of steps rendered as one ragged
 * block with no indent and no hanging alignment. Coach answers are mostly
 * steps, which made the most common response the worst looking one.
 */
function parseMarkdown(text: string): string {
  const lines = escapeHtml(text).split('\n')
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null

  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+?)\*/g, '$1<em>$2</em>')
      .replace(/`(.+?)`/g, '<code style="background:var(--et-ground);padding:1px 5px;border-radius:5px;font-size:12.5px">$1</code>')

  const close = () => { if (list) { out.push(`</${list}>`); list = null } }
  const open = (kind: 'ul' | 'ol') => {
    if (list === kind) return
    close()
    out.push(`<${kind} style="margin:6px 0 6px 18px;padding:0;display:flex;flex-direction:column;gap:4px">`)
    list = kind
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    const heading = /^#{1,3}\s+(.*)$/.exec(line)

    if (bullet) {
      open('ul')
      out.push(`<li>${inline(bullet[1])}</li>`)
    } else if (numbered) {
      open('ol')
      out.push(`<li>${inline(numbered[1])}</li>`)
    } else if (heading) {
      close()
      out.push(`<strong style="display:block;font-size:14.5px;margin:8px 0 2px">${inline(heading[1])}</strong>`)
    } else if (line.trim() === '') {
      close()
      out.push('<div style="height:8px"></div>')
    } else {
      close()
      out.push(`<div>${inline(line)}</div>`)
    }
  }
  close()
  return out.join('')
}

function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  function handleCopy() {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-end gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 mb-0.5">
          <LogoMark size={28} />
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[82%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          style={{
            padding: '11px 15px',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            background: isUser
              ? 'linear-gradient(135deg, #2563EB, #7C3AED)'
              : 'var(--et-surface)',
            border: isUser ? 'none' : '1px solid var(--et-border)',
            boxShadow: isUser ? 'var(--shadow-blue-sm)' : 'var(--shadow-sm)',
            color: isUser ? '#fff' : 'var(--et-ink)',
            fontSize: '14px',
            lineHeight: 1.6,
          }}
          dangerouslySetInnerHTML={
            isUser
              ? undefined
              : { __html: parseMarkdown(message.content) }
          }
        >
          {isUser ? message.content : undefined}
        </div>

        {/* Copy button on AI messages */}
        {!isUser && !message.streaming && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={handleCopy}
            style={{
              fontSize: '11px',
              color: 'var(--et-placeholder)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: 4,
              fontWeight: 500,
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

interface Insight {
  type: string
  text: string
  prompt: string
}

export default function CareerPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showTyping, setShowTyping] = useState(false)
  const [insights, setInsights] = useState<Insight[]>([])
  // Which track the teen tapped. Purely a UI affordance for showing that
  // track's starter questions — the model infers register from what is
  // actually said, never from this.
  const [track, setTrack] = useState<string | null>(null)
  // Read from X-Coach-Remaining. Null until the first reply, so we never show
  // a limit warning to someone who has not sent anything.
  const [remaining, setRemaining] = useState<number | null>(null)
  const [focused, setFocused] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Bumped after every save so the drawer refetches its list.
  const [historyKey, setHistoryKey] = useState(0)
  // The conversation being written to. Held in a ref as well as state because
  // sendMessage closes over it and a fresh chat creates the row mid-send —
  // reading state there would see the value from before the create.
  const [conversationId, setConversationId] = useState<string | null>(null)
  const convoRef = useRef<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Proactive insights — computed server-side from the user's real data
  useEffect(() => {
    fetch('/api/coach-insights')
      .then((r) => r.json())
      .then((d) => setInsights(Array.isArray(d?.insights) ? d.insights : []))
      .catch(() => { /* chips just don't render */ })
  }, [])

  // ── Conversation persistence (tab-scoped) ──
  // sessionStorage survives in-app navigation and refreshes but clears when
  // the tab closes — users can bounce to the feed and come back mid-convo.
  // Restored in an effect (not a lazy initializer) to avoid SSR hydration
  // mismatch.
  const CHAT_KEY = 'et-coach-chat'
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CHAT_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Message[]
        if (Array.isArray(saved) && saved.length > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setMessages(saved.map((m) => ({ ...m, streaming: false })))
        }
      }
    } catch { /* corrupt storage — start fresh */ }
  }, [])

  useEffect(() => {
    // Don't thrash storage on every streamed token — save only once the
    // stream settles (no message mid-flight).
    if (messages.some((m) => m.streaming)) return
    try {
      if (messages.length > 0) {
        sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-60)))
      } else {
        sessionStorage.removeItem(CHAT_KEY)
      }
    } catch { /* storage full/unavailable — chat still works, just won't persist */ }
  }, [messages])

  // Start a new conversation. Nothing is deleted: the previous chat is already
  // saved and reachable from the drawer, which is the whole point of this
  // feature. Previously "New chat" destroyed the only copy.
  function clearChat() {
    abortRef.current?.abort()
    setMessages([])
    setTrack(null)
    setConversationId(null)
    convoRef.current = null
    try { sessionStorage.removeItem(CHAT_KEY) } catch { /* noop */ }
    try { sessionStorage.removeItem(CHAT_KEY) } catch { /* noop */ }
  }

  // Grow the textarea to fit, up to the CSS max-height, then let it scroll.
  // Reset to 'auto' first or the box can only ever get taller: scrollHeight is
  // measured against the current height, so shrinking never happens.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`
  }, [input])

  // Abort mid-answer. The reader loop already treats AbortError as a normal
  // exit, so the partial text stays on screen instead of being replaced with
  // an error — which is what the teen wanted when they hit stop.
  function stopStreaming() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setShowTyping(false)
    setMessages((prev) => prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)))
  }

  // Load a saved chat into the view. Aborts anything in flight first, so a
  // stream from the previous conversation cannot append tokens into this one.
  const openConversation = useCallback(async (id: string) => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setShowTyping(false)
    setTrack(null)
    convoRef.current = id
    setConversationId(id)
    const rows = await loadMessages(id)
    setMessages(rows.map((r) => ({ id: r.id, role: r.role, content: r.content })))
  }, [])

  function scrollToBottom(smooth = true) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, showTyping])

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || isStreaming) return

    setInput('')
    setIsStreaming(true)
    setShowTyping(true)

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)

    // Persist in the background. Deliberately not awaited: the answer must not
    // wait on a write, and if the tables are missing every one of these calls
    // no-ops and the chat behaves exactly as it did before saving existed.
    void (async () => {
      let cid = convoRef.current
      if (!cid) {
        cid = await createConversation(content)
        if (cid) {
          convoRef.current = cid
          setConversationId(cid)
        }
      }
      if (cid) {
        await appendMessage(cid, 'user', content)
        setHistoryKey((k) => k + 1)
      }
    })()

    // Brief delay before AI starts "typing"
    await new Promise((r) => setTimeout(r, 400))
    setShowTyping(false)

    const assistantId = (Date.now() + 1).toString()
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ])

    try {
      abortRef.current = new AbortController()

      const res = await fetch('/api/career-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Last 20 turns is plenty of context — restored sessions can grow
          // long and the full history would bloat the prompt for no gain
          messages: updatedMessages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortRef.current.signal,
      })

      const left = res.headers.get('X-Coach-Remaining')
      if (left !== null) setRemaining(Number(left))

      if (!res.body) throw new Error('No stream body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))

        for (const line of lines) {
          const data = line.replace('data: ', '').trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            const token = parsed.choices?.[0]?.delta?.content ?? ''
            if (token) {
              accumulated += token
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: accumulated } : m
                )
              )
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Save the finished answer. After the loop, so a half-streamed reply is
      // never written — reopening a chat should show what the teen actually
      // read, not a fragment.
      if (convoRef.current && accumulated.trim()) {
        void appendMessage(convoRef.current, 'assistant', accumulated).then(() =>
          setHistoryKey((k) => k + 1),
        )
      }

      // Mark streaming done. If NOTHING parseable arrived (non-SSE error
      // response, dropped connection), never leave a silent empty bubble.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                streaming: false,
                content: m.content.trim() === ''
                  ? "Hmm, I didn't get a response through — give it another try. If it keeps happening, refresh the page."
                  : m.content,
              }
            : m
        )
      )
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Something went wrong. Try again.', streaming: false }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [input, messages, isStreaming])

  // ── Deep-link prompts (?ask=...) ──
  // Get Ready mode gig cards land here with a tailored prompt. Read from
  // window.location (not useSearchParams — avoids the Suspense boundary
  // requirement), send once, then scrub the URL so refresh doesn't re-send.
  const askSentRef = useRef(false)
  useEffect(() => {
    if (askSentRef.current) return
    try {
      const params = new URLSearchParams(window.location.search)
      const ask = params.get('ask')
      if (ask && ask.trim()) {
        askSentRef.current = true
        window.history.replaceState({}, '', '/career')
        // Defer one tick so restored-session state settles first
        setTimeout(() => sendMessage(ask.trim()), 50)
      }
    } catch { /* no deep link — normal page load */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}
    >
      {/* ── Header ──
          Says which model is answering. Not decoration: the marketing page
          names the model, so the product has to be checkable against the claim
          from inside the product itself. */}
      <div
        className="flex-shrink-0 px-5 pt-safe-header pb-3.5"
        style={{ borderBottom: '1px solid var(--et-border)' }}
      >
        <div className="flex items-center gap-3">
          {/* History lives on the left, where every chat product puts it. */}
          <button
            onClick={() => setHistoryOpen(true)}
            aria-label="Saved chats"
            className="press"
            style={{
              width: 34, height: 34, borderRadius: 11, flexShrink: 0, cursor: 'pointer',
              background: 'var(--et-surface)', border: '1px solid var(--et-border-mid)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2.5 4h11M2.5 8h11M2.5 12h7" stroke="var(--et-subtle)" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <LogoMark size={32} />
          <div className="flex-1" style={{ minWidth: 0 }}>
            <h1 className="display" style={{ fontSize: '17px', lineHeight: 1.15 }}>AI Coach</h1>
            <p style={{ fontSize: '11px', color: 'var(--et-muted)', marginTop: 2 }}>
              Knows your profile, your matches and what you have applied to
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="press"
              style={{
                fontSize: '12px', fontWeight: 600, color: 'var(--et-muted)',
                background: 'var(--et-surface)', border: '1px solid var(--et-border-mid)',
                borderRadius: 10, padding: '6px 12px', cursor: 'pointer', flexShrink: 0,
              }}
            >
              New chat
            </button>
          )}
        </div>

        {/* Warn while there is still room to plan around it, not at zero. */}
        {remaining !== null && remaining <= 8 && (
          <p style={{ fontSize: '11px', color: remaining <= 2 ? 'var(--et-amber)' : 'var(--et-placeholder)', marginTop: 8 }}>
            {remaining === 0
              ? 'No messages left today. Resets at midnight UTC.'
              : `${remaining} message${remaining === 1 ? '' : 's'} left today`}
          </p>
        )}
      </div>

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto scrollbar-hide px-4"
        style={{ paddingTop: 16, paddingBottom: 8 }}
      >
        {isEmpty ? (
          /* ── Empty state ──
             Three tracks instead of a flat prompt list. See TRACKS at the top
             of this file for why: a list of five resume prompts silently tells
             a teen who needs bus fare by Friday that this tool is not for them.
             Tapping a track only reveals its starter questions — the model
             infers register from what actually gets typed, so nothing here
             locks anyone into a lane. */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ paddingTop: 18, paddingBottom: 16 }}
          >
            <h2 className="display display-lg" style={{ lineHeight: 1.18 }}>
              What are you<br />trying to do?
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--et-muted)', marginTop: 8, marginBottom: 20, lineHeight: 1.55 }}>
              Pick whichever is closest, or just start typing. You can ask about
              anything from either side of this.
            </p>

            {/* Proactive insights — computed from this user's real data, so
                they sit above the generic tracks. */}
            {insights.length > 0 && (
              <div className="flex flex-col gap-2" style={{ marginBottom: 20 }}>
                <p className="numbered-eyebrow">FOR YOU TODAY</p>
                {insights.map((ins, i) => (
                  <motion.button
                    key={ins.type}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => sendMessage(ins.prompt)}
                    className="grad-border"
                    style={{
                      width: '100%', padding: '13px 15px', textAlign: 'left',
                      background: 'var(--et-surface)', cursor: 'pointer',
                      fontSize: '13px', fontWeight: 600, color: 'var(--et-ink)', lineHeight: 1.45,
                    }}
                  >
                    {ins.text}
                  </motion.button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {TRACKS.map((t, i) => {
                const open = track === t.id
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      borderRadius: 18,
                      border: `1px solid ${open ? t.color : 'var(--et-border)'}`,
                      background: open ? t.tint : 'var(--et-surface)',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      onClick={() => setTrack(open ? null : t.id)}
                      className="press"
                      style={{
                        width: '100%', textAlign: 'left', cursor: 'pointer',
                        background: 'none', border: 'none', padding: '14px 15px',
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                      }}
                    >
                      <span
                        style={{
                          width: 9, height: 9, borderRadius: '50%', background: t.color,
                          flexShrink: 0, marginTop: 5,
                        }}
                      />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span className="display" style={{ display: 'block', fontSize: '15px' }}>{t.label}</span>
                        <span style={{ display: 'block', fontSize: '12.5px', color: 'var(--et-subtle)', marginTop: 3, lineHeight: 1.45 }}>
                          {t.blurb}
                        </span>
                      </span>
                      <motion.span
                        animate={{ rotate: open ? 90 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        style={{ flexShrink: 0, marginTop: 3, lineHeight: 0 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M6 3.5L10.5 8L6 12.5" stroke={open ? t.color : 'var(--et-placeholder)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="flex flex-col gap-1.5" style={{ padding: '0 15px 14px' }}>
                            {t.prompts.map((q) => (
                              <button
                                key={q}
                                onClick={() => sendMessage(q)}
                                className="press"
                                style={{
                                  width: '100%', textAlign: 'left', cursor: 'pointer',
                                  background: 'var(--et-surface)',
                                  border: '1px solid var(--et-border)',
                                  borderRadius: 12, padding: '10px 12px',
                                  fontSize: '13px', color: 'var(--et-subtle)', lineHeight: 1.45,
                                }}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </AnimatePresence>

            {showTyping && <TypingIndicator />}
          </div>
        )}

        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      <ChatHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        activeId={conversationId}
        onSelect={(id) => { void openConversation(id) }}
        onNew={clearChat}
        refreshKey={historyKey}
      />

      {/* ── Composer ──
          A textarea, not an <input>. The coach is regularly asked to review a
          paragraph a teen wrote, and a single-line field showed them a moving
          keyhole of their own text with no way to see what they had typed.
          Grows to a cap, then scrolls.

          Enter sends, Shift+Enter breaks a line — the convention everywhere
          else, and worth honouring because the alternative is people
          accidentally sending half a sentence. */}
      <div
        className="flex-shrink-0 px-4 py-3 safe-bottom"
        style={{
          borderTop: '1px solid var(--et-border)',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          className="flex items-end gap-2"
          style={{
            background: 'var(--et-surface)',
            borderRadius: 22,
            padding: '6px 6px 6px 14px',
            border: `1.5px solid ${focused ? 'var(--et-blue)' : 'var(--et-border-mid)'}`,
            transition: 'border-color 0.15s ease',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask anything"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: '14.5px',
              lineHeight: 1.45,
              color: 'var(--et-ink)',
              fontFamily: 'var(--font-sans)',
              maxHeight: 132,
              overflowY: 'auto',
              padding: '9px 0',
            }}
          />

          {/* While streaming this becomes Stop. A long answer the teen has
              already read enough of used to have no exit except leaving the
              page, and on a phone that means losing the thread. */}
          {isStreaming ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={stopStreaming}
              aria-label="Stop generating"
              style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: 'var(--et-ground)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{ width: 11, height: 11, borderRadius: 3, background: 'var(--et-subtle)' }} />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              aria-label="Send"
              style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: input.trim()
                  ? 'linear-gradient(135deg, var(--et-match-from), var(--et-match-to))'
                  : 'var(--et-ground)',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'default',
                transition: 'background 0.2s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 13V3M8 3L4 7M8 3L12 7"
                  stroke={input.trim() ? '#fff' : 'var(--et-placeholder)'}
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}
