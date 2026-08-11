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
}

const BRANDS: Record<string, Brand> = {
  // ── Food ──
  'target':                 { domain: 'target.com',            color: '#CC0000' },
  'starbucks':              { domain: 'starbucks.com',         color: '#00704A' },
  'chipotle':               { domain: 'chipotle.com',          color: '#A81612' },
  'chipotle mexican grill': { domain: 'chipotle.com',          color: '#A81612' },
  'insomnia cookies':       { domain: 'insomniacookies.com',   color: '#1E2A5A' },
  'blue bottle coffee':     { domain: 'bluebottlecoffee.com',  color: '#0F4C9C' },
  'dunkin':                 { domain: 'dunkindonuts.com',      color: '#FF671F' },
  "dunkin'":                { domain: 'dunkindonuts.com',      color: '#FF671F' },
  'panera bread':           { domain: 'panerabread.com',       color: '#5C8727' },
  'shake shack':            { domain: 'shakeshack.com',        color: '#4C9F45' },
  'sweetgreen':             { domain: 'sweetgreen.com',        color: '#00453B' },
  'chick-fil-a':            { domain: 'chick-fil-a.com',       color: '#E51636' },
  "mcdonald's":             { domain: 'mcdonalds.com',         color: '#DA291C' },
  'burger king':            { domain: 'bk.com',                color: '#D62300' },
  'taco bell':              { domain: 'tacobell.com',          color: '#702082' },
  'five guys':              { domain: 'fiveguys.com',          color: '#ED174F' },
  'eataly':                 { domain: 'eataly.com',            color: '#00693E' },
  'gopuff':                 { domain: 'gopuff.com',            color: '#00C9A7' },
  'pret a manger':          { domain: 'pret.com',              color: '#862633' },

  // ── Grocery ──
  'whole foods market':     { domain: 'wholefoodsmarket.com',  color: '#00674B' },
  "trader joe's":           { domain: 'traderjoes.com',        color: '#C8102E' },
  'wegmans':                { domain: 'wegmans.com',           color: '#005DAA' },
  'stop & shop':            { domain: 'stopandshop.com',       color: '#E01A2B' },
  'shoprite':               { domain: 'shoprite.com',          color: '#E11B22' },
  'key food':               { domain: 'keyfood.com',           color: '#D6001C' },
  'h mart':                 { domain: 'hmart.com',             color: '#E4002B' },
  'acme markets':           { domain: 'acmemarkets.com',       color: '#D2232A' },

  // ── Retail ──
  'hot topic':              { domain: 'hottopic.com',          color: '#000000' },
  'boxlunch':               { domain: 'boxlunch.com',          color: '#E5308A' },
  'boxlunch / hot topic':   { domain: 'boxlunch.com',          color: '#E5308A' },
  'glossier':               { domain: 'glossier.com',          color: '#F7C6C7' },
  'thuma':                  { domain: 'thuma.co',              color: '#2E2A26' },
  'urban outfitters':       { domain: 'urbanoutfitters.com',   color: '#000000' },
  'american eagle outfitters': { domain: 'ae.com',             color: '#003087' },
  'bath & body works':      { domain: 'bathandbodyworks.com',  color: '#003057' },
  "macy's":                 { domain: 'macys.com',             color: '#E21A2C' },
  'tj maxx':                { domain: 'tjmaxx.tjx.com',        color: '#E2231A' },
  'marshalls':              { domain: 'marshalls.com',         color: '#003DA5' },
  'michaels':               { domain: 'michaels.com',          color: '#E4002B' },
  'barnes & noble':         { domain: 'barnesandnoble.com',    color: '#2C5234' },
  'foot locker':            { domain: 'footlocker.com',        color: '#EB1D2D' },
  "dick's sporting goods":  { domain: 'dickssportinggoods.com', color: '#006747' },
  'old navy':               { domain: 'oldnavy.gap.com',       color: '#003764' },
  'uniqlo':                 { domain: 'uniqlo.com',            color: '#FF0000' },
  'sephora':                { domain: 'sephora.com',           color: '#000000' },
  'ulta beauty':            { domain: 'ulta.com',              color: '#E01E5A' },
  'cvs':                    { domain: 'cvs.com',               color: '#CC0000' },
  'walgreens':              { domain: 'walgreens.com',         color: '#E31837' },

  // ── Everything else ──
  'city of new york':       { domain: 'nyc.gov',               color: '#0F4D90' },
  'amc theatres':           { domain: 'amctheatres.com',       color: '#C8102E' },
  'regal cinemas':          { domain: 'regmovies.com',         color: '#26256B' },
  'planet fitness':         { domain: 'planetfitness.com',     color: '#6A1B9A' },
  'ymca':                   { domain: 'ymca.org',              color: '#E4002B' },
  'lifetime':               { domain: 'lifetime.life',         color: '#A6192E' },
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
 * Logo sources, in order, for a verified domain.
 *
 * GOOGLE IS GONE. `google.com/s2/favicons` does not 404 when it has no icon —
 * it GENERATES a coloured letter tile and serves it with HTTP 200. That is
 * what put a green "L" on Insomnia Cookies and it is undetectable from the
 * client: a fabricated logo and a real one look identical to onError, to the
 * status code, and (at 128px) to a size check. Four attempts died on this.
 *
 * Both sources below return a real 404 when they have nothing, which is the
 * only property that matters — it makes onError meaningful, so the chain can
 * fall through deterministically to the brand-colour tile.
 *
 *   1. Clearbit Logo API — actual brand marks, transparent PNG, built for
 *      exactly this. Best quality for chains.
 *   2. unavatar.io with fallback=false — aggregates several sources; the flag
 *      is what forces a 404 instead of a generated placeholder.
 *   3. (handled in OrgLogo) the employer's initial on the employer's colour.
 */
export function logoSources(domain: string, size = 128): string[] {
  return [
    `https://logo.clearbit.com/${domain}?size=${size}`,
    `https://unavatar.io/${domain}?fallback=false`,
  ]
}
