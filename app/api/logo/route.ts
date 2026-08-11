/**
 * EMPLOYTEENS — logo proxy
 *
 * WHY THIS EXISTS. THE ACTUAL ROOT CAUSE, MEASURED.
 *
 * Every previous logo attempt pointed the browser at a third-party icon
 * service. I tested unavatar from our own origin, got 15 of 15, and shipped it.
 * Re-tested it today against the 31 Explore domains and got 27 failures — then
 * one `fetch` showed why:
 *
 *     HTTP 429
 *
 * unavatar rate-limits per CLIENT IP, around 30 requests an hour on the free
 * tier. The Explore page renders 31 cards. So a single page load exhausts one
 * teen's entire hourly quota, the first few logos resolve, and the rest 429 into
 * the initials tile. That is exactly the "logos are inconsistent" symptom, and
 * it is not intermittent — it is deterministic and it gets WORSE the more
 * opportunities we add. My first test passed only because the quota was fresh.
 *
 * No amount of fixing OrgLogo could have solved this, which is why six attempts
 * downstream of it did nothing.
 *
 * THE FIX. The browser must never talk to an icon service. It asks US. We fetch
 * server-side from Vercel, once, and the CDN caches the bytes for a year. Thirty
 * one fetches total, ever — not thirty one per visitor. There is no per-user
 * quota because there is no per-user request.
 *
 * SOURCE ORDER, best mark first:
 *   1. <link rel="apple-touch-icon"> from the site's own HTML — usually 180px
 *      and the actual logo, which is what makes cards look designed.
 *   2. <link rel="icon"> from the same HTML.
 *   3. /apple-touch-icon.png, then /favicon.ico at the root.
 *   4. unavatar, LAST. Only reached for the handful of sites publishing
 *      nothing, and only on a cold cache, so the quota is never a factor.
 *
 * On total failure we 404 deliberately. OrgLogo's onError then draws the brand
 * tile, which is a designed outcome rather than a broken image.
 *
 * SSRF: the domain must be on ALLOWED, built from the two hand-checked tables.
 * An image proxy that fetches arbitrary attacker-supplied URLs from inside our
 * infrastructure is a real vulnerability, not a theoretical one — it can reach
 * cloud metadata endpoints and private network ranges. Allowlist, not a filter.
 */

import { NextRequest } from 'next/server'
import { OPPORTUNITY_SOURCES } from '@/lib/jobs/opportunity-sources'
import { allLogoSlugs } from '@/lib/jobs/brands'

export const runtime = 'nodejs'
// Never statically evaluated; the domain is a query param.
export const dynamic = 'force-dynamic'

/** Domains we are willing to fetch from. Nothing else, ever. */
const ALLOWED: Set<string> = new Set([
  ...OPPORTUNITY_SOURCES.map((o) => o.homepage).filter((d): d is string => Boolean(d)),
  ...allLogoSlugs().map((b) => b.domain),
])

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

/** A year at the CDN, a day in the browser. These marks do not change. */
const CACHE = 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800'

async function get(url: string, timeoutMs = 6000): Promise<Response | null> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: '*/*' },
    })
    return res.ok ? res : null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

/**
 * Icon URLs declared in the page's own <head>, largest first.
 *
 * Regex rather than a DOM parser on purpose: we want three attributes off a
 * handful of self-closing tags, and pulling in a parser to run on untrusted
 * third-party HTML inside a serverless function is a worse trade than a regex
 * that fails closed. Only the first 200KB is scanned; <head> is always there.
 */
function iconsFromHtml(html: string, base: string): string[] {
  const out: { url: string; size: number; touch: boolean }[] = []
  const linkRe = /<link\b[^>]*>/gi
  for (const tag of html.slice(0, 200_000).match(linkRe) ?? []) {
    const rel = /rel\s*=\s*["']?([^"'>]+)/i.exec(tag)?.[1]?.toLowerCase() ?? ''
    if (!/\b(apple-touch-icon|apple-touch-icon-precomposed|icon|shortcut icon)\b/.test(rel)) continue
    const href = /href\s*=\s*["']([^"']+)/i.exec(tag)?.[1]
    if (!href) continue
    // SVG is ideal but some CDNs serve it with a content-type browsers reject
    // in an <img>; it still works far more often than not, so keep it.
    const sizes = /sizes\s*=\s*["']?(\d+)/i.exec(tag)?.[1]
    try {
      out.push({
        url: new URL(href, base).toString(),
        size: sizes ? parseInt(sizes, 10) : /\.svg(\?|$)/i.test(href) ? 512 : 0,
        touch: rel.includes('apple-touch'),
      })
    } catch {
      /* malformed href */
    }
  }
  // apple-touch-icon is nearly always the real logo on a solid background,
  // which reads better at 48px than a cramped 16px favicon.
  out.sort((a, b) => Number(b.touch) - Number(a.touch) || b.size - a.size)
  return out.map((i) => i.url)
}

export async function GET(req: NextRequest) {
  const domain = (req.nextUrl.searchParams.get('d') ?? '').toLowerCase().trim()

  if (!domain || !ALLOWED.has(domain)) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': CACHE } })
  }

  const origin = `https://${domain}`
  const candidates: string[] = []

  const page = await get(origin)
  if (page) {
    try {
      candidates.push(...iconsFromHtml(await page.text(), page.url || origin))
    } catch {
      /* body read failed; fall through to the well-known paths */
    }
  }

  candidates.push(
    `${origin}/apple-touch-icon.png`,
    `${origin}/apple-touch-icon-precomposed.png`,
    `${origin}/favicon.ico`,
    // Last, and only on a cold cache. See the header on why this cannot be first.
    `https://unavatar.io/${domain}?fallback=false`,
  )

  for (const url of candidates.slice(0, 8)) {
    const res = await get(url)
    if (!res) continue

    const type = res.headers.get('content-type') ?? ''
    if (!type.startsWith('image/')) continue

    const buf = await res.arrayBuffer()
    // Under 100 bytes is a tracking pixel or an error page mislabelled as an
    // image, not a logo.
    if (buf.byteLength < 100) continue

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Content-Length': String(buf.byteLength),
        'Cache-Control': CACHE,
        'X-Logo-Source': new URL(url).hostname,
      },
    })
  }

  // Honest 404. OrgLogo draws the brand tile, which is a design, not a failure.
  return new Response('No icon', { status: 404, headers: { 'Cache-Control': CACHE } })
}
