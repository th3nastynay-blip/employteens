'use client'

/**
 * EMPLOYTEENS — organisation logo, with a fallback that looks designed
 *
 * Every EC card was rendering the same grey globe. Two causes: the logo was
 * resolved from the APPLY url (so form hosts won), and when nothing resolved
 * we shipped Google's placeholder globe rather than admitting it.
 *
 * A placeholder that repeats across a whole list is worse than no image — it
 * reads as unfinished. So the fallback here is a monogram: the org's initials
 * on a colour derived from its own name. Deterministic, so DOROT is always the
 * same green and Sloan Kettering always the same blue, which over time works
 * like a real logo does — you recognise it before you read it.
 *
 * The favicon route also fails LOUDLY now. Google's service returns HTTP 200
 * with a globe rather than a 404, so `onError` never fires and we cannot
 * detect a miss from the response. Instead we check the decoded image: their
 * placeholder comes back at 16px regardless of the requested size, so a
 * naturalWidth under 32 on a request for 128 means we got the globe, and we
 * swap to the monogram.
 */

import { useState } from 'react'

const PALETTE = [
  ['#2563EB', '#7C3AED'], // brand blue → purple
  ['#0891B2', '#2563EB'], // cyan → blue
  ['#7C3AED', '#DB2777'], // purple → pink
  ['#059669', '#0891B2'], // green → cyan
  ['#D97706', '#DB2777'], // amber → pink
  ['#4F46E5', '#0891B2'], // indigo → cyan
]

/** Stable hash so an org keeps its colour across sessions and devices. */
function hashOf(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Initials from the org name. Two letters max, and stop-words are dropped so
 * "The Great Sunflower Project" reads GS rather than TG.
 */
function initialsOf(name: string): string {
  const stop = new Set(['the', 'of', 'and', 'for', 'a', 'an', 'at', 'in', 'de'])
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stop.has(w.toLowerCase()))
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

interface Props {
  src?: string | null
  name: string
  size?: number
  radius?: number
}

export function OrgLogo({ src, name, size = 48, radius = 12 }: Props) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  const [from, to] = PALETTE[hashOf(name) % PALETTE.length]
  const initials = initialsOf(name)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        background: showImage ? 'var(--et-surface)' : `linear-gradient(135deg, ${from}, ${to})`,
        border: showImage ? '1px solid var(--et-border)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden="true"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            // Google returns 200 + a 16px globe when it has nothing. Requesting
            // 128 and receiving 16 is the only reliable tell.
            const img = e.currentTarget
            if (img.naturalWidth > 0 && img.naturalWidth < 32) setFailed(true)
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            padding: size > 40 ? 8 : 5,
          }}
        />
      ) : (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: Math.round(size * 0.38),
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {initials}
        </span>
      )}
    </div>
  )
}
