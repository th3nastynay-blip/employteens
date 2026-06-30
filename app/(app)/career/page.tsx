'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TOOLS = [
  { id: 'resume', emoji: '📄', title: 'Resume Builder', desc: 'AI builds a resume from your profile in 30 seconds.' },
  { id: 'interview', emoji: '🎤', title: 'Interview Simulator', desc: 'Practice real interview questions for your target job.' },
  { id: 'strategy', emoji: '🧠', title: 'Application Strategy', desc: 'AI tells you how to stand out for each job you apply to.' },
  { id: 'optimize', emoji: '⚡', title: 'Job Fit Optimizer', desc: 'Upload a job description — AI scores your fit and gaps.' },
]

export default function CareerPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/career-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, tool: activeTool }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'ai', text: data.reply ?? 'I\'ll help you with that!' }])
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Something went wrong. Try again in a moment.' }])
    }

    setLoading(false)
    setTimeout(scrollToBottom, 100)
  }

  function selectTool(id: string) {
    setActiveTool(id)
    const tool = TOOLS.find((t) => t.id === id)!
    setMessages([{
      role: 'ai',
      text: id === 'resume'
        ? `I'll build a professional resume from your EmployTeens profile. I'll tailor it for teen job seekers in NY/NJ. Ready? Just say "Build my resume" to start.`
        : id === 'interview'
        ? `Let's practice! Tell me the job title you're interviewing for and I'll give you real questions employers ask. What's the job?`
        : id === 'strategy'
        ? `Paste the job title or job description and I'll give you a specific strategy to maximize your chances of getting hired.`
        : `Paste a job description and I'll score your fit, identify gaps, and tell you exactly how to improve your application.`,
    }])
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-[#111111]">Career AI</h1>
        <p className="text-sm text-[#6B7280] mt-1">Your personal job coach</p>
      </div>

      {!activeTool ? (
        /* Tool picker */
        <div className="px-5 flex flex-col gap-3 pb-4">
          {TOOLS.map((tool, i) => (
            <motion.button
              key={tool.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => selectTool(tool.id)}
              className="bg-white rounded-2xl px-5 py-4 border border-gray-100 flex items-center gap-4 text-left hover:border-blue-200 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">
                {tool.emoji}
              </div>
              <div>
                <p className="font-semibold text-[#111111]">{tool.title}</p>
                <p className="text-xs text-[#6B7280] mt-0.5">{tool.desc}</p>
              </div>
              <svg className="ml-auto text-[#9CA3AF]" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          ))}
        </div>
      ) : (
        /* Chat interface */
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Tool header */}
          <div className="px-5 pb-3 flex items-center gap-3">
            <button
              onClick={() => { setActiveTool(null); setMessages([]) }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-100"
            >
              ←
            </button>
            <span className="font-semibold text-sm text-[#374151]">
              {TOOLS.find((t) => t.id === activeTool)?.emoji} {TOOLS.find((t) => t.id === activeTool)?.title}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-3 pb-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#3B82F6] text-white rounded-br-md'
                    : 'bg-white text-[#374151] border border-gray-100 rounded-bl-md'
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <span className="text-sm text-[#9CA3AF] loading-text">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-5 pb-6 flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask anything…"
              className="flex-1 h-12 bg-white border border-gray-200 rounded-2xl px-4 text-sm text-[#111111] placeholder-gray-400 focus:outline-none focus:border-[#3B82F6] transition-colors"
            />
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-12 h-12 bg-[#3B82F6] rounded-2xl flex items-center justify-center disabled:opacity-40 shadow-md shadow-blue-100"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9H15M15 9L10 4M15 9L10 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          </div>
        </div>
      )}
    </div>
  )
}
