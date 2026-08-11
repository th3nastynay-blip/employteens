'use client'

/**
 * EMPLOYTEENS — organisation tile
 *
 * WHY THERE IS NO LOGO-GUESSING ANY MORE
 *
 * Three attempts at third-party logos, three different failures:
 *
 *   1. Favicon from the APPLY url → Google Forms' globe on BGIC, Workday's on
 *      Sloan Kettering, because the apply link points at a form host.
 *   2. Favicon from the ORG's domain → still a grey globe for anything without
 *      one, repeated down the whole list.
 *   3. Favicon from a GUESSED domain → the worst of the three. Google's icon
 *      service does not 404 when it has nothing; it GENERATES a coloured
 *      letter tile. Those come back at full size, so the "is it the 16px
 *      globe" check waves them straight through. The feed rendered a green
 *      "L" on Insomnia Cookies — a logo Google invented — while Target, whose
 *      domain is obviously right, fell back to a monogram.
 *
 * That is not a tuning problem. A service that fabricates a plausible-looking
 * logo cannot be told apart from one that found a real one, so every card
 * becomes a coin flip and the list can never look consistent.
 *
 * So: we render a real logo ONLY when someone deliberately supplied one
 * (`src`), which today means the 31 curated opportunities where the org's own
 * domain was checked by hand. Everything else gets the same designed tile.
 * Uniform by construction rather than by luck, no third-party request per
 * card, nothing invented.
 *
 * If real employer logos are wanted later, the honest route is local assets
 * for the ~20 chains that dominate this market — checked in, checked once,
 * never guessed.
 */

import { useState } from 'react'

/**
 * Initials. Two letters max, stop-words dropped so "The Great Sunflower
 * Project" reads GS rather than TG, and franchise noise trimmed so
 * "Chipotle - Journal Square" reads C rather than CJ.
 */
function initialsOf(name: string): string {
  const stop = new Set(['the', 'of', 'and', 'for', 'a', 'an', 'at', 'in', 'de'])
  const head = String(name ?? '').split(/\s+[-–—|]\s+|,|\s#/)[0]
  const words = head
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stop.has(w.toLowerCase()))
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

interface Props {
  /**
   * A logo we actually hold. Null for every job row — see the header. Do NOT
   * add guessing here; that is the bug this file exists to close.
   */
  src?: string | null
  name: string
  size?: number
  radius?: number
}

export function OrgLogo({ src, name, size = 48, radius = 12 }: Props) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed
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
        // Constant tile. The contents may vary; the container never does.
        background: 'var(--et-surface-2)',
        border: '1px solid var(--et-border)',
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
            // Backstop for the placeholder-globe case on curated rows.
            const img = e.currentTarget
            if (img.naturalWidth > 0 && img.naturalWidth < 32) setFailed(true)
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            padding: size > 40 ? 8 : 5,
            background: 'var(--et-surface)',
          }}
        />
      ) : (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: Math.round(size * 0.34),
            fontWeight: 800,
            color: 'var(--et-muted)',
            letterSpacing: '0.01em',
            lineHeight: 1,
          }}
        >
          {initials}
        </span>
      )}
    </div>
  )
}
