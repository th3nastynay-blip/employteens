'use client'

/**
 * EMPLOYTEENS — Rotating hero headline
 *
 * ~15 premium headlines cycling every ~4.2s. Letter-by-letter flip in
 * (rotateX + fade + rise), whole-block fade out — the Apple/Linear/CalAI
 * register: fast, weighted, never bouncy. The accent line always renders
 * in the brand gradient (blue → purple). Fixed min-height prevents layout
 * shift between 2- and 3-line headlines. Respects prefers-reduced-motion.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface HeadlineLine {
  text: string
  accent?: boolean
}

const HEADLINES: HeadlineLine[][] = [
  [{ text: 'Your next job' }, { text: 'already knows', accent: true }, { text: 'your schedule.' }],
  [{ text: 'Your first' }, { text: 'paycheck', accent: true }, { text: 'starts here.' }],
  [{ text: 'Work after school,' }, { text: 'not before.', accent: true }],
  [{ text: 'Built for' }, { text: 'teenagers.', accent: true }],
  [{ text: 'Skip the' }, { text: 'endless', accent: true }, { text: 'searching.' }],
  [{ text: 'Find work that' }, { text: 'fits your life.', accent: true }],
  [{ text: 'Your schedule' }, { text: 'comes first.', accent: true }],
  [{ text: 'AI already found' }, { text: 'your next', accent: true }, { text: 'opportunity.' }],
  [{ text: 'Every job here' }, { text: 'is verified.', accent: true }],
  [{ text: 'First job?' }, { text: 'We built this', accent: true }, { text: 'for you.' }],
  [{ text: 'No experience?' }, { text: 'No problem.', accent: true }],
  [{ text: 'Real jobs.' }, { text: 'Real pay.', accent: true }, { text: 'Zero scams.' }],
  [{ text: 'Your age isn’t' }, { text: 'a problem', accent: true }, { text: 'here.' }],
  [{ text: 'Weekends free?' }, { text: 'Someone’s hiring.', accent: true }],
  [{ text: 'Get hired' }, { text: 'minutes', accent: true }, { text: 'from home.' }],
]

const ROTATE_MS = 4200
const easeOut = [0.22, 1, 0.36, 1] as const

function FlipLine({ line, lineIndex, reduced }: { line: HeadlineLine; lineIndex: number; reduced: boolean }) {
  const chars = Array.from(line.text)
  // Per-line base delay so line 2 starts as line 1 is finishing — reads as
  // one continuous cascade, not three separate animations.
  const base = lineIndex * 0.14

  return (
    <span style={{ display: 'block', whiteSpace: 'nowrap' }}>
      {chars.map((ch, i) => (
        <motion.span
          key={`${lineIndex}-${i}`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, rotateX: 85, y: 10 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, rotateX: 0, y: 0 }}
          transition={{
            duration: reduced ? 0.3 : 0.5,
            ease: easeOut,
            delay: base + i * 0.022,
          }}
          className={line.accent ? 'match-gradient-text' : undefined}
          style={{
            display: 'inline-block',
            transformOrigin: '50% 100%',
            // preserve spaces — inline-block collapses them
            whiteSpace: ch === ' ' ? 'pre' : undefined,
          }}
        >
          {ch === ' ' ? ' ' : ch}
        </motion.span>
      ))}
    </span>
  )
}

export function RotatingHeadline() {
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion() ?? false

  useEffect(() => {
    const id = setInterval(() => {
      // Don't burn cycles (or skip frames) in a hidden tab
      if (document.visibilityState !== 'visible') return
      setIndex((i) => (i + 1) % HEADLINES.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <h1
      style={{
        fontSize: '38px',
        fontWeight: 800,
        letterSpacing: '-0.04em',
        lineHeight: 1.06,
        color: 'var(--et-ink)',
        // Reserve 3 lines so 2-line headlines don't shift the layout
        minHeight: 'calc(3 * 1.06em)',
        perspective: 600,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          style={{ display: 'block' }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.28, ease: easeOut } }}
        >
          {HEADLINES[index].map((line, li) => (
            <FlipLine key={li} line={line} lineIndex={li} reduced={reduced} />
          ))}
        </motion.span>
      </AnimatePresence>
    </h1>
  )
}
