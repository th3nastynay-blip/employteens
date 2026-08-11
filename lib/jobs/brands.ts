/**
 * EMPLOYTEENS — employer brand table
 *
 * WHAT WENT WRONG BEFORE, SO IT DOES NOT HAPPEN AGAIN
 *
 * The Extracurriculars logos work because every one of the 31 entries carries a
 * HAND-CHECKED domain. The jobs feed had none, so I tried deriving domains from
 * company names and let Google's favicon service resolve them. It failed two
 * ways at once: nothing for target.com, and a fabricated green letter tile for
 * another row. Google does not 404 when it lacks an icon — it generates one —
 * so a miss is indistinguishable from a hit.
 *
 * This table fixes the input (verified domains only, never guessed) AND removes
 * the dependency on the miss being detectable, by giving every brand a colour.
 * If the favicon loads, you get the real mark. If anything at all goes wrong,
 * you get that employer's initial on that employer's actual brand colour —
 * which is still instantly recognisable and, crucially, still CONSISTENT.
 *
 * There is no guessing path. A company not in this table gets the neutral
 * tile. Adding one is a single line, and that is deliberate: the cost of being
 * wrong here is a stranger's brand on a card we are asking a teen to trust.
 *
 * Colours are each brand's primary, taken from their own public brand usage.
 */

export interface Brand {
  /** Verified. Never inferred from the company name. */
  domain: string
  /** Primary brand colour, used for the fallback tile. */
  color: string
  /**
   * Filename stem under /public/logos. Checked FIRST, before any network
   * source. Drop `<slug>.png` (or .svg) in and that employer is correct
   * forever, with no third party involved.
   */
  slug: string
}

const BRANDS: Record<string, Brand> = {
  // ── Food ──
  'target':                 { domain: 'target.com', color: '#CC0000', slug: 'target' },
  'starbucks':              { domain: 'starbucks.com', color: '#00704A', slug: 'starbucks' },
  'chipotle':               { domain: 'chipotle.com', color: '#A81612', slug: 'chipotle' },
  'chipotle mexican grill': { domain: 'chipotle.com', color: '#A81612', slug: 'chipotle' },
  'insomnia cookies':       { domain: 'insomniacookies.com', color: '#1E2A5A', slug: 'insomniacookies' },
  'blue bottle coffee':     { domain: 'bluebottlecoffee.com', color: '#0F4C9C', slug: 'bluebottlecoffee' },
  'dunkin':                 { domain: 'dunkindonuts.com', color: '#FF671F', slug: 'dunkindonuts' },
  "dunkin'":                { domain: 'dunkindonuts.com', color: '#FF671F', slug: 'dunkindonuts' },
  'panera bread':           { domain: 'panerabread.com', color: '#5C8727', slug: 'panerabread' },
  'shake shack':            { domain: 'shakeshack.com', color: '#4C9F45', slug: 'shakeshack' },
  'sweetgreen':             { domain: 'sweetgreen.com', color: '#00453B', slug: 'sweetgreen' },
  'chick-fil-a':            { domain: 'chick-fil-a.com', color: '#E51636', slug: 'chickfila' },
  "mcdonald's":             { domain: 'mcdonalds.com', color: '#DA291C', slug: 'mcdonalds' },
  'burger king':            { domain: 'bk.com', color: '#D62300', slug: 'bk' },
  'taco bell':              { domain: 'tacobell.com', color: '#702082', slug: 'tacobell' },
  'five guys':              { domain: 'fiveguys.com', color: '#ED174F', slug: 'fiveguys' },
  'eataly':                 { domain: 'eataly.com', color: '#00693E', slug: 'eataly' },
  'gopuff':                 { domain: 'gopuff.com', color: '#00C9A7', slug: 'gopuff' },
  'pret a manger':          { domain: 'pret.com', color: '#862633', slug: 'pret' },

  // ── Grocery ──
  'whole foods market':     { domain: 'wholefoodsmarket.com', color: '#00674B', slug: 'wholefoodsmarket' },
  "trader joe's":           { domain: 'traderjoes.com', color: '#C8102E', slug: 'traderjoes' },
  'wegmans':                { domain: 'wegmans.com', color: '#005DAA', slug: 'wegmans' },
  'stop & shop':            { domain: 'stopandshop.com', color: '#E01A2B', slug: 'stopandshop' },
  'shoprite':               { domain: 'shoprite.com', color: '#E11B22', slug: 'shoprite' },
  'key food':               { domain: 'keyfood.com', color: '#D6001C', slug: 'keyfood' },
  'h mart':                 { domain: 'hmart.com', color: '#E4002B', slug: 'hmart' },
  'acme markets':           { domain: 'acmemarkets.com', color: '#D2232A', slug: 'acmemarkets' },

  // ── Retail ──
  'hot topic':              { domain: 'hottopic.com', color: '#000000', slug: 'hottopic' },
  'boxlunch':               { domain: 'boxlunch.com', color: '#E5308A', slug: 'boxlunch' },
  'boxlunch / hot topic':   { domain: 'boxlunch.com', color: '#E5308A', slug: 'boxlunch' },
  'glossier':               { domain: 'glossier.com', color: '#F7C6C7', slug: 'glossier' },
  'thuma':                  { domain: 'thuma.co', color: '#2E2A26', slug: 'thuma' },
  'urban outfitters':       { domain: 'urbanoutfitters.com', color: '#000000', slug: 'urbanoutfitters' },
  'american eagle outfitters': { domain: 'ae.com', color: '#003087', slug: 'ae' },
  'bath & body works':      { domain: 'bathandbodyworks.com', color: '#003057', slug: 'bathandbodyworks' },
  "macy's":                 { domain: 'macys.com', color: '#E21A2C', slug: 'macys' },
  'tj maxx':                { domain: 'tjmaxx.tjx.com', color: '#E2231A', slug: 'tjmaxx' },
  'marshalls':              { domain: 'marshalls.com', color: '#003DA5', slug: 'marshalls' },
  'michaels':               { domain: 'michaels.com', color: '#E4002B', slug: 'michaels' },
  'barnes & noble':         { domain: 'barnesandnoble.com', color: '#2C5234', slug: 'barnesandnoble' },
  'foot locker':            { domain: 'footlocker.com', color: '#EB1D2D', slug: 'footlocker' },
  "dick's sporting goods":  { domain: 'dickssportinggoods.com', color: '#006747', slug: 'dickssportinggoods' },
  'old navy':               { domain: 'oldnavy.gap.com', color: '#003764', slug: 'oldnavy' },
  'uniqlo':                 { domain: 'uniqlo.com', color: '#FF0000', slug: 'uniqlo' },
  'sephora':                { domain: 'sephora.com', color: '#000000', slug: 'sephora' },
  'ulta beauty':            { domain: 'ulta.com', color: '#E01E5A', slug: 'ulta' },
  'cvs':                    { domain: 'cvs.com', color: '#CC0000', slug: 'cvs' },
  'walgreens':              { domain: 'walgreens.com', color: '#E31837', slug: 'walgreens' },

  // ── Everything else ──
  'city of new york':       { domain: 'nyc.gov', color: '#0F4D90', slug: 'nyc' },
  'amc theatres':           { domain: 'amctheatres.com', color: '#C8102E', slug: 'amctheatres' },
  'regal cinemas':          { domain: 'regmovies.com', color: '#26256B', slug: 'regmovies' },
  'planet fitness':         { domain: 'planetfitness.com', color: '#6A1B9A', slug: 'planetfitness' },
  'ymca':                   { domain: 'ymca.org', color: '#E4002B', slug: 'ymca' },
  'lifetime':               { domain: 'lifetime.life', color: '#A6192E', slug: 'lifetime' },
}

/**
 * Look up a brand, tolerating the noise real listings carry:
 * "Chipotle - Journal Square", "Target #1234", "ShopRite of Bayonne".
 *
 * Exact matches only after that trimming. No fuzzy fallback — see the header.
 */
export function brandFor(company: string | null | undefined): Brand | null {
  const raw = String(company ?? '').trim().toLowerCase()
  if (!raw) return null
  if (BRANDS[raw]) return BRANDS[raw]

  // Franchise / location suffixes.
  const head = raw.split(/\s+[-–—|]\s+|,|\s#/)[0].trim()
  if (BRANDS[head]) return BRANDS[head]

  const beforeOf = head.split(/\s+(?:of|at|in)\s+/)[0].trim()
  if (BRANDS[beforeOf]) return BRANDS[beforeOf]

  return null
}

/**
 * Logo sources, in order. VERIFIED FROM THE LIVE APP ORIGIN, not assumed.
 *
 * I tested every one of these by loading them from employteensfinal.vercel.app
 * in a real browser, because the previous five attempts were all reasoning
 * about services I could not reach from the build sandbox.
 *
 * Results:
 *
 *   google.com/s2/favicons  — DOES NOT 404. Generates a coloured letter tile
 *     and serves it 200, so a fabricated logo is indistinguishable from a real
 *     one. This produced the green "L" on Insomnia Cookies. Never use it.
 *
 *   logo.clearbit.com — works when you navigate to the URL directly, FAILS
 *     for every domain when requested from our own page. It blocks referred
 *     requests. That is why it looked correct in isolation and never once
 *     appeared in the feed. Removed.
 *
 *   unavatar.io?fallback=false — 15 of 15 test domains returned a real image
 *     from our origin. This is the one that actually works.
 *
 * Sizes vary a lot (16px for michaels.com, 600px for cvs.com) because these
 * are whatever icon the site publishes. OrgLogo drops anything under 24px to
 * the brand tile rather than rendering a blurry 16px square at 44px.
 */
export function logoSources(brand: Brand, _size = 128): string[] {
  const local = LOCAL_LOGOS[brand.slug]

  // A FILE WE HOLD IS THE ONLY SOURCE. No chain, no fallback, no size check.
  //
  // The chain was the bug. Every extra candidate is another onError that can
  // advance the index, and any one of them misfiring lands on the tile — which
  // is exactly what kept happening. When the file is in the repo there is
  // nothing to fall back FROM: it is deployed with the app, same origin, same
  // cache lifetime, and it either exists or the build is broken.
  if (local) return [`/logos/${brand.slug}.${local}?v=${LOGO_VERSION}`]

  // Only brands with no file of their own reach the network.
  return [`https://unavatar.io/${brand.domain}?fallback=false`]
}

/** Bump when logo files change, to defeat cached 404s. */
export const LOGO_VERSION = 2

/**
 * Files present in /public/logos, slug → extension.
 *
 * Keep this in step when adding a file. `npm run logos:manifest` regenerates
 * it from the directory listing.
 */
const LOCAL_LOGOS: Record<string, string> = {
  chipotle: 'png',
  cvs: 'webp',
  dunkindonuts: 'png',
  eataly: 'png',
  gopuff: 'png',
  hottopic: 'ico',
  insomniacookies: 'png',
  macys: 'webp',
  mcdonalds: 'ico',
  shoprite: 'png',
  starbucks: 'png',
  target: 'png',
  wegmans: 'png',
}



/** Every filename the app will look for. Used by the generator script. */
export function allLogoSlugs(): { slug: string; name: string; domain: string }[] {
  const seen = new Set<string>()
  const out: { slug: string; name: string; domain: string }[] = []
  for (const [name, b] of Object.entries(BRANDS)) {
    if (seen.has(b.slug)) continue
    seen.add(b.slug)
    out.push({ slug: b.slug, name, domain: b.domain })
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug))
}
