'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

const SUGGESTED_PROMPTS = [
  'Help me write a resume with no experience',
  'How do I prepare for a Chipotle interview?',
  'I only have Tuesdays and weekends free — what jobs fit?',
  'Starbucks rejected me. What should I do?',
  'Do I need a work permit at 16 in New York?',
]

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

function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:var(--et-ground);padding:1px 5px;border-radius:4px;font-size:12px">$1</code>')
    .replace(/^#{1,3} (.+)$/gm, '<strong style="font-size:15px">$1</strong>')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/^\d+\. (.+)$/gm, (_, p1, offset, str) => {
      const lines = str.slice(0, offset).split('\n')
      const prev = lines.filter((l: string) => /^\d+\./.test(l))
      return `${prev.length + 1}. ${p1}`
    })
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

function MessageBubble({ message, isLast }: { message: Message; isLast: boolean }) {
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
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

  function clearChat() {
    abortRef.current?.abort()
    setMessages([])
    try { sessionStorage.removeItem(CHAT_KEY) } catch { /* noop */ }
  }

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
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 px-5 pt-12 pb-4"
        style={{ borderBottom: '1px solid var(--et-border)' }}
      >
        <div className="flex items-center gap-3">
          <LogoMark size={32} />
          <div className="flex-1">
            <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--et-ink)', letterSpacing: '-0.01em' }}>
              AI Coach
            </h1>
            <div className="flex items-center gap-1.5">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--et-green)' }} />
              <p style={{ fontSize: '11px', color: 'var(--et-muted)', fontWeight: 500 }}>
                Always online · knows your profile
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              style={{
                fontSize: '12px', fontWeight: 600, color: 'var(--et-muted)',
                background: 'var(--et-surface)', border: '1px solid var(--et-border-mid)',
                borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
              }}
            >
              New chat
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto scrollbar-hide px-4"
        style={{ paddingTop: 16, paddingBottom: 8 }}
      >
        {isEmpty ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
            style={{ paddingTop: 24, paddingBottom: 16 }}
          >
            {/* AI avatar */}
            <div
              style={{
                width: 64, height: 64,
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <LogoMark size={36} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--et-ink)', letterSpacing: '-0.02em', textAlign: 'center', marginBottom: 6 }}>
              What can I help with?
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--et-muted)', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
              Resume, interviews, applications, work permits — ask anything.
            </p>

            {/* Proactive insights — from the user's actual data */}
            {insights.length > 0 && (
              <div className="flex flex-col gap-2 w-full" style={{ marginBottom: 14 }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--et-placeholder)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  For you today
                </p>
                {insights.map((ins, i) => (
                  <motion.button
                    key={ins.type}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => sendMessage(ins.prompt)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, #EFF6FF, #F5F3FF)',
                      border: '1px solid rgba(124,58,237,0.18)',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--et-ink)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    ✨ {ins.text}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Suggested prompts */}
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <motion.button
                  key={prompt}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => sendMessage(prompt)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--et-surface)',
                    border: '1px solid var(--et-border)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--et-subtle)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'border-color 0.12s ease',
                  }}
                >
                  {prompt}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <MessageBubble key={msg.id} message={msg} isLast={i === messages.length - 1} />
              ))}
            </AnimatePresence>

            {showTyping && <TypingIndicator />}
          </div>
        )}

        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* ── Input bar ── */}
      <div
        className="flex-shrink-0 px-4 py-3 safe-bottom"
        style={{
          borderTop: '1px solid var(--et-border)',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          className="flex items-center gap-2"
          style={{
            background: 'var(--et-ground)',
            borderRadius: 'var(--radius-full)',
            padding: '6px 6px 6px 16px',
            border: '1.5px solid var(--et-border-mid)',
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything…"
            disabled={isStreaming}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: 'var(--et-ink)',
              fontFamily: 'var(--font-sans)',
            }}
          />

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            style={{
              width: 36, height: 36,
              borderRadius: 'var(--radius-full)',
              background: input.trim() && !isStreaming
                ? 'linear-gradient(135deg, #2563EB, #7C3AED)'
                : 'var(--et-border)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !isStreaming ? 'pointer' : 'default',
              transition: 'background 0.2s ease, transform 0.1s ease',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8H13M13 8L8.5 3.5M13 8L8.5 12.5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
