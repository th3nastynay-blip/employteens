/**
 * EMPLOYTEENS — market geography check
 *
 * The old ATS-route check used bare substrings — 'ny' matched "Su__nny__vale"
 * and "Alba__ny__" (fine) but also let "Manhattan Beach, CA" through via
 * 'manhattan'. Word-boundary matching plus an explicit out-of-market state
 * rejection. Shared by ingestion and the trust audit.
 */

/**
 * MARKET IS COMMUTE RANGE, NOT STATE LINES.
 *
 * The previous definition treated anywhere in NY or NJ as in-market: a blanket
 * `\b(ny|nyc|nj)\b` rule plus an explicit allowlist containing Albany, Buffalo,
 * Rochester and Syracuse. Live consequences, measured 2026-08-10 against 675
 * active rows:
 *
 *   - 337 of 675 listings (50%) were unreachable for any Hudson County teen.
 *     Cherry Hill and Glassboro are near Philadelphia. Bridgehampton is on the
 *     South Fork. Buffalo is 400 miles away.
 *   - "Rochester Hills MI" got in. The out-of-state check only matched a state
 *     abbreviation preceded by a comma, so "MI" with no comma slipped past,
 *     and then `\brochester\b` matched the upstate-NY allowlist. A Michigan
 *     listing on a Hudson County teen job board.
 *
 * A 15-year-old who legally cannot work past 7pm on a school night is not
 * commuting to Syracuse. Tiers below encode reachability, not geography.
 */

/** Hudson County. Walk, bus, or a short light-rail ride. */
const CORE = /\b(jersey city|hoboken|bayonne|union city|west new york|north bergen|secaucus|kearny|weehawken|guttenberg|harrison|east newark)\b/i

/** One PATH, subway, or bus ride. Realistic for 16+ on a weekend or after school. */
const TRANSIT = /\b(manhattan|brooklyn|queens|bronx|staten island|harlem|williamsburg|astoria|long island city|greenpoint|bushwick|fresh meadows|flushing|newark|elizabeth|belleville|bloomfield|montclair|east rutherford|edgewater|fort lee|north arlington|nutley)\b/i

/** Reachable with a longer trip or a parent drop-off. Ranked below the above. */
const EXTENDED = /\b(paramus|hackensack|clifton|passaic|woodbridge|rutherford|lyndhurst|teaneck|englewood|fairview|cliffside park|palisades park|ridgefield|carlstadt|wallington|garfield|yonkers)\b/i

/** Bare "New York, NY" style strings with no city detail. Treated as transit tier. */
const NYC_GENERIC = /\bnew york\s*(city)?\s*[, ]\s*(ny|new york)\b|\bnyc\b/i

/**
 * Counties, for sources that return "Belleville, Essex County" with no state.
 * Only counties actually within commute range. Erie, Monroe and Onondaga
 * (Buffalo, Rochester, Syracuse) are deliberately absent.
 */
const IN_MARKET_COUNTY = /\b(hudson|bergen|essex|passaic|union)\s+county\b/i
const NYC_COUNTY = /\b(kings|richmond|new york|bronx|queens)\s+county\b/i

/**
 * Out-of-state detection. Now matches a two-letter state code at the end of the
 * string with OR without a preceding comma, which is what let "Rochester Hills
 * MI" through. NY and NJ are excluded from this list for obvious reasons.
 */
const OUT_OF_MARKET_STATE =
  /(?:,\s*|\s+)(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NM|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b|\b(california|texas|florida|washington|oregon|colorado|illinois|georgia|arizona|pennsylvania|massachusetts|virginia|ohio|michigan|connecticut|maryland)\b/i

/**
 * NY and NJ places that are in-state but far outside commute range. Listed
 * explicitly because a source returning "Buffalo, NY" passes every state check.
 */
const FAR_IN_STATE =
  /\b(albany|buffalo|rochester|syracuse|ithaca|binghamton|vestal|poughkeepsie|utica|schenectady|niagara|watertown|plattsburgh|elmira|corning|victor|canandaigua|lake grove|bridgehampton|southampton|montauk|riverhead|hauppauge|melville|westbury|middletown|newburgh|kingston|saratoga)\b/i
const FAR_NJ =
  /\b(cherry hill|deptford|glassboro|marlton|moorestown|mays landing|vineland|millville|atlantic city|cape may|toms river|howell|freehold|lakewood|brick|manahawkin|burlington|mount laurel|voorhees|washington township|ewing|trenton|hamilton|lawrenceville|princeton|new brunswick|edison|piscataway|bridgewater|raritan|somerville|flemington|phillipsburg|hackettstown|rockaway|dover|morristown|cedar knolls|parlin|sayreville|old bridge|manalapan|marlboro|red bank|middletown township|long branch|asbury park|westfield|cranford|rahway|linden|perth amboy)\b/i

export type MarketTier = 'core' | 'transit' | 'extended' | 'out'

/**
 * How reachable is this location for a Hudson County teen?
 * Useful for ranking: a core listing should outrank an extended one even when
 * both are technically in market.
 */
export function marketTier(location: string): MarketTier {
  const loc = (location ?? '').trim()
  if (!loc) return 'out'

  // Hard rejections first. An explicit out-of-state marker or a known far-away
  // place beats any city-name coincidence ("Manhattan Beach, CA", "Rochester
  // Hills MI", "Middletown, NY").
  if (OUT_OF_MARKET_STATE.test(loc)) return 'out'
  if (FAR_IN_STATE.test(loc)) return 'out'
  if (FAR_NJ.test(loc)) return 'out'

  if (CORE.test(loc) || IN_MARKET_COUNTY.test(loc)) return 'core'
  if (TRANSIT.test(loc) || NYC_GENERIC.test(loc) || NYC_COUNTY.test(loc)) return 'transit'
  if (EXTENDED.test(loc)) return 'extended'

  // A bare state name with no recognizable place is not actionable. Previously
  // this returned true and was the single largest source of junk inventory.
  return 'out'
}

export function isInMarket(location: string): boolean {
  return marketTier(location) !== 'out'
}

/**
 * City-name → representative ZIP for NY/NJ metro. Ingested jobs frequently
 * arrive with a location string but no ZIP ('00000' default), which poisoned
 * distance scoring — the match engine couldn't compute miles and fell back
 * to an optimistic guess. Mapping the city to a central ZIP gives an honest
 * approximate distance instead. Order matters: longer/more-specific names
 * first ("west new york" before "new york").
 */
const CITY_ZIP: [RegExp, string][] = [
  [/\bwest new york\b/i, '07093'],
  [/\bjersey city\b/i, '07306'],
  [/\bhoboken\b/i, '07030'],
  [/\bbayonne\b/i, '07002'],
  [/\bunion city\b/i, '07087'],
  [/\bnorth bergen\b/i, '07047'],
  [/\bsecaucus\b/i, '07094'],
  [/\bkearny\b/i, '07032'],
  [/\bweehawken\b/i, '07086'],
  [/\bguttenberg\b/i, '07093'],
  [/\bharrison\b/i, '07029'],
  [/\beast newark\b/i, '07029'],
  [/\bnewark\b/i, '07102'],
  [/\belizabeth\b/i, '07201'],
  [/\bpaterson\b/i, '07501'],
  [/\bclifton\b/i, '07011'],
  [/\bhackensack\b/i, '07601'],
  [/\bfort lee\b/i, '07024'],
  [/\bedgewater\b/i, '07020'],
  [/\bparamus\b/i, '07652'],
  [/\bbelleville\b/i, '07109'],
  [/\bbloomfield\b/i, '07003'],
  [/\bmontclair\b/i, '07042'],
  [/\bmanhattan\b/i, '10001'],
  [/\bbrooklyn\b/i, '11201'],
  [/\bqueens\b/i, '11354'],
  [/\bbronx\b/i, '10451'],
  [/\bstaten island\b/i, '10301'],
  [/\byonkers\b/i, '10701'],
  [/\bnew york\b/i, '10001'], // generic NYC — after all specific boroughs/towns
]

export function zipFromLocation(location: string): string | null {
  const loc = (location ?? '').trim()
  if (!loc) return null
  for (const [pattern, zip] of CITY_ZIP) {
    if (pattern.test(loc)) return zip
  }
  return null
}
