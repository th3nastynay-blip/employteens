'use client'

/**
 * EMPLOYTEENS — organisation tile
 *
 * THREE ATTEMPTS AT THIRD-PARTY LOGOS, AND WHAT FINALLY WORKED
 *
 *   1. Favicon from the APPLY url → Google Forms' globe on BGIC, Workday's on
 *      Sloan Kettering, because the apply link points at a form host.
 *   2. Favicon from a GUESSED domain → worse. Google's icon service does not
 *      404 when it has nothing; it GENERATES a coloured letter tile, at full
 *      size, so the "is it the 16px globe" check waved them through. The feed
 *      showed a green "L" on Insomnia Cookies — a logo Google invented — while
 *      Target, whose domain is obviously right, got no icon at all.
 *   3. No logos at all → consistent, and dull.
 *
 * The lesson from 2 is that a service which fabricates a plausible logo cannot
 * be distinguished from one that found a real one, so DETECTING the miss is
 * the wrong problem to solve. Stop needing to detect it.
 *
 * Now: verified domains only (lib/jobs/brands.ts, hand-checked, never
 * inferred), and every brand also carries its primary colour. Favicon loads →
 * real mark. Favicon fails, 404s, or returns something invented → the
 * employer's initial on the employer's own colour. Target reads red either
 * way, Starbucks green either way. Recognisable and consistent whichever
 * branch runs, which is what makes it safe to depend on a flaky service.
 *
 * A company absent from the table gets the neutral tile. Adding one is a
 * single line, and it stays manual on purpose: the cost of guessing wrong is a
 * stranger's brand on a card we are asking a teen to trust.
 */

import { useState } from 'react'
import { brandFor, faviconFor } from '@/lib/jobs/brands'

/** White text on dark brands, dark text on pale ones (Glossier pink). */
function readableOn(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  // Rec. 709 luma. Above ~0.62 the tile is light enough to need dark text.
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.62 ? '#1A1A1A' : '#FFFFFF'
}

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
   * An explicitly supplied logo (curated opportunities). When absent we fall
   * back to the brand table, never to a guess derived from the name.
   */
  src?: string | null
  name: string
  size?: number
  radius?: number
}

export function OrgLogo({ src, name, size = 48, radius = 12 }: Props) {
  const [failed, setFailed] = useState(false)

  // Verified domains only, from lib/jobs/brands.ts. There is no name-guessing
  // path any more — that is what produced a fabricated logo last time.
  const brand = brandFor(name)
  const resolved = src ?? (brand ? faviconFor(brand.domain) : null)
  const showImage = Boolean(resolved) && !failed
  const initials = initialsOf(name)

  // The whole point of the brand colour: when the favicon fails — and it will,
  // unpredictably — we do not fall back to grey. Target still reads as red,
  // Starbucks still reads as green. Recognisable either way, consistent either
  // way, and it no longer matters whether we can detect the miss.
  const tint = !showImage && brand ? brand.color : null

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
        background: tint ?? 'var(--et-surface-2)',
        border: tint ? 'none' : '1px solid var(--et-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-hidden="true"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved as string}
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
            color: tint ? readableOn(tint) : 'var(--et-muted)',
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
