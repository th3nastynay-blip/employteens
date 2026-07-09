/**
 * EMPLOYTEENS — market geography check
 *
 * The old ATS-route check used bare substrings — 'ny' matched "Su__nny__vale"
 * and "Alba__ny__" (fine) but also let "Manhattan Beach, CA" through via
 * 'manhattan'. Word-boundary matching plus an explicit out-of-market state
 * rejection. Shared by ingestion and the trust audit.
 */

const IN_MARKET_PATTERNS: RegExp[] = [
  /\b(ny|nyc|nj)\b/i,
  /\bnew york\b/i,
  /\bnew jersey\b/i,
  /\b(manhattan|brooklyn|queens|bronx|staten island|harlem)\b/i,
  /\b(hoboken|jersey city|bayonne|union city|west new york|north bergen|secaucus|kearny|weehawken|guttenberg|harrison|east newark)\b/i,
  /\b(newark|paramus|woodbridge|clifton|hackensack|edgewater|fort lee)\b/i,
  /\b(albany|buffalo|rochester|syracuse|yonkers|white plains|long island)\b/i,
  // County-form locations — Adzuna often returns "Belleville, Essex County"
  // with no state at all. Queries are NY/NJ-scoped, so a NJ/NY county name
  // without a contradicting out-of-market state is in-market.
  /\b(hudson|bergen|essex|passaic|union|middlesex|monmouth|morris|ocean|somerset|mercer|camden|burlington|atlantic|gloucester|cumberland|hunterdon|sussex|warren|salem|cape may)\s+county\b/i,
  /\b(westchester|nassau|suffolk|rockland|putnam|dutchess|orange|erie|monroe|onondaga|kings|richmond)\s+county\b/i,
]

// States/regions that are definitively NOT our market. If one of these
// appears as the location's state, in-market city-name coincidences lose
// ("Manhattan Beach, CA" contains 'manhattan' but ', CA' wins).
const OUT_OF_MARKET_STATE = /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NM|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b|\b(california|texas|florida|washington|oregon|colorado|illinois|georgia|arizona|pennsylvania|massachusetts|virginia|ohio|michigan)\b/i

export function isInMarket(location: string): boolean {
  const loc = (location ?? '').trim()
  if (!loc) return false
  if (OUT_OF_MARKET_STATE.test(loc)) return false
  return IN_MARKET_PATTERNS.some((p) => p.test(loc))
}
