'use client'

/**
 * EMPLOYTEENS — organisation logo, with a fallback that looks designed
 *
 * Every EC card was rendering the same grey globe. Two causes: the logo was
 * resolved from the APPLY url (so form hosts won), and when nothing resolved
 * we shipped Google's placeholder globe rather than admitting it.
 *
 * A placeholder that repeats across a whole list is worse than no image — it
 * reads as unfinished. So the fallback is a monogram in ONE quiet treatment,
 * inside the same tile a real logo would occupy.
 *
 * The favicon route also fails LOUDLY now. Google's service returns HTTP 200
 * with a globe rather than a 404, so `onError` never fires and we cannot
 * detect a miss from the response. Instead we check the decoded image: their
 * placeholder comes back at 16px regardless of the requested size, so a
 * naturalWidth under 32 on a request for 128 means we got the globe, and we
 * swap to the monogram.
 */

import { useState } from 'react'
import { domainForCompany } from '@/lib/jobs/company-domain'

/**
 * ONE monogram treatment, not six.
 *
 * This used to pick from six gradients by name hash, on the theory that a
 * consistent colour per org helps recognition. In a feed where NOTHING has a
 * real logo — job rows have never had logo_url populated — that produced forty
 * randomly coloured tiles in a column, which reads as broken rather than as a
 * system. The colour was carrying no information; it was just noise with a
 * stable seed.
 *
 * A single quiet treatment lets the real logos be the thing that varies, which
 * is the only variation that means anything.
 */

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

  // Fall back to deriving a domain from the company name. Job rows have no
  // logo_url — the opportunity ingest sets it, the job pipeline never did — so
  // without this every job card is a monogram. A wrong guess degrades to the
  // monogram via the 32px check below, never to another company's logo.
  const resolved = src ?? (() => {
    const domain = domainForCompany(name)
    return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : null
  })()

  const showImage = Boolean(resolved) && !failed
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
        // Identical container whether or not a logo resolved. Mixed real
        // logos and monograms only look deliberate if the TILE is constant and
        // the contents vary, rather than the other way round.
        background: 'var(--et-surface)',
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
          src={resolved as string}
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
            fontSize: Math.round(size * 0.36),
            fontWeight: 800,
            color: 'var(--et-placeholder)',
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
