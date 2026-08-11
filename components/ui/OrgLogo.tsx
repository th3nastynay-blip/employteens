'use client'

/**
 * EMPLOYTEENS — organisation tile
 *
 * SIX ATTEMPTS AT THIRD-PARTY LOGOS. See lib/jobs/brands.ts for what each
 * service actually does when tested from our own origin — the short version is
 * that Google fabricates logos, Clearbit blocks referred requests, and
 * unavatar works. Everything below assumes that, and it was measured rather
 * than reasoned about.
 *
 * ORIGINAL NOTES
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
import { brandFor, logoSources } from '@/lib/jobs/brands'

/**
 * A stable colour for an organisation we have no brand entry for.
 *
 * The alternative was one grey tile for every unbranded org, and on the Explore
 * page — where most entries are nonprofits and colleges that publish no usable
 * icon — that produced a column of identical grey squares that read as "this
 * page is broken" rather than "this org has no logo".
 *
 * Hashed from the name, so it is deterministic: the same org is the same colour
 * on every device, every render, forever, with nothing fetched. Saturation and
 * lightness are fixed and deliberately muted so these sit BEHIND real logos in
 * the visual hierarchy instead of competing with them. Hue is quantised to 24
 * steps because neighbouring hues a few degrees apart just look like a mistake.
 */
function hueTint(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return `hsl(${(h % 24) * 15}, 42%, 38%)`
}

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

/**
 * Is this a Google favicon URL?
 *
 * THE BUG THAT ATE SEVEN ATTEMPTS. supabase/migrations/add_logo_url.sql
 * backfilled EVERY job row with
 *
 *     https://www.google.com/s2/favicons?domain=<company>
 *
 * and OrgLogo starts `src ? [src] : brand ...`, so a populated logo_url meant
 * the brand table and every local file were never consulted. Google then
 * returned its fabricated letter tile for Insomnia Cookies (the green "L") and
 * nothing for Target (the red "TA"). Both symptoms, one cause, sitting in the
 * database the whole time while I changed code downstream of it.
 *
 * Treated as no src at all. A stored value we know to be poison is worse than
 * an empty column.
 */
function isPoisonedSrc(u: string | null | undefined): boolean {
  return typeof u === 'string' && /google\.com\/s2\/favicons/i.test(u)
}

export function OrgLogo({ src, name, size = 48, radius = 12 }: Props) {
  const brand = brandFor(name)
  const usableSrc = isPoisonedSrc(src) ? null : src

  // An ORDERED chain, not a single URL. Each source 404s honestly when it has
  // nothing, so onError advancing the index is a real signal rather than a
  // guess. Index past the end = every source failed = brand tile.
  const sources = usableSrc ? [usableSrc] : brand ? logoSources(brand, size * 2) : []
  const [idx, setIdx] = useState(0)

  const resolved = idx < sources.length ? sources[idx] : null
  const isLocal = typeof resolved === 'string' && resolved.startsWith('/logos/')
  const showImage = Boolean(resolved)
  const initials = initialsOf(name)

  // When every source fails we do NOT fall back to grey. A known brand keeps
  // its own colour (Target red, Starbucks green) so the feed stays recognisable
  // on a total network miss; anything else gets a stable colour hashed from its
  // name, so a page of logo-less nonprofits looks varied and intentional rather
  // than like a wall of failed image loads.
  const tint = showImage ? null : brand ? brand.color : hueTint(name)

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
          // Advance to the next source. Because these 404 properly, this
          // fires for real misses rather than silently accepting an invented
          // placeholder.
          onError={() => setIdx((i) => i + 1)}
          onLoad={(e) => {
            // Size check applies to NETWORK sources only. A file in our own
            // repo was put there deliberately; second-guessing it at runtime
            // is how a perfectly good 32px logo ended up as a letter tile.
            if (isLocal) return
            const img = e.currentTarget
            if (img.naturalWidth > 0 && img.naturalWidth < 24) setIdx((i) => i + 1)
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
