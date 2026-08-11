/**
 * EMPLOYTEENS — company name → website domain, for logos
 *
 * WHY THIS EXISTS
 *
 * Job rows have never had logo_url populated — the opportunity ingest sets it,
 * the job pipeline does not, so every job card fell back to a monogram. A feed
 * of forty differently-coloured letter tiles reads as broken rather than as a
 * design choice, which is exactly what Nayan spotted.
 *
 * We cannot take the domain from apply_url: that points at Greenhouse, Lever,
 * Workday or SmartRecruiters, and resolving a favicon there gives us the ATS
 * vendor's logo on every card. Same class of bug that put Google Forms' globe
 * on the Boston Global Investment Competition.
 *
 * So: name → domain. Curated for the employers that actually appear in a
 * Hudson County / NYC teen feed, heuristic after that.
 *
 * WHY GUESSING IS SAFE HERE
 *
 * A wrong guess does not show a wrong logo. Google's favicon service returns
 * its 16px globe for a domain it cannot resolve, and <OrgLogo> treats any
 * decoded image under 32px as a miss and swaps to the monogram. So the failure
 * mode of a bad guess is "no logo", not "somebody else's logo".
 *
 * The one real risk is a guess that lands on a DIFFERENT REAL company's
 * domain. That is why the curated map exists and why the heuristic refuses
 * anything it cannot form confidently — see the bail-outs in domainForCompany.
 */

/** Employers seen in the NJ/NY teen market whose domain is not guessable. */
const CURATED: Record<string, string> = {
  // Food
  'chipotle mexican grill': 'chipotle.com',
  'blue bottle coffee': 'bluebottlecoffee.com',
  'insomnia cookies': 'insomniacookies.com',
  'panera bread': 'panerabread.com',
  'dunkin': 'dunkindonuts.com',
  "dunkin'": 'dunkindonuts.com',
  'shake shack': 'shakeshack.com',
  'sweetgreen': 'sweetgreen.com',
  'chick-fil-a': 'chick-fil-a.com',
  "mcdonald's": 'mcdonalds.com',
  'burger king': 'bk.com',
  'taco bell': 'tacobell.com',
  'five guys': 'fiveguys.com',
  'eataly': 'eataly.com',
  'gopuff': 'gopuff.com',
  'pret a manger': 'pret.com',
  'joe coffee': 'joecoffeecompany.com',

  // Grocery
  'whole foods market': 'wholefoodsmarket.com',
  'trader joe': 'traderjoes.com',
  "trader joe's": 'traderjoes.com',
  'wegmans': 'wegmans.com',
  'stop & shop': 'stopandshop.com',
  'shoprite': 'shoprite.com',
  'key food': 'keyfood.com',
  'h mart': 'hmart.com',

  // Retail
  'boxlunch / hot topic': 'hottopic.com',
  'hot topic': 'hottopic.com',
  'boxlunch': 'boxlunch.com',
  'glossier': 'glossier.com',
  'thuma': 'thuma.co',
  'urban outfitters': 'urbanoutfitters.com',
  'american eagle outfitters': 'ae.com',
  'bath & body works': 'bathandbodyworks.com',
  "macy's": 'macys.com',
  'tj maxx': 'tjmaxx.tjx.com',
  'marshalls': 'marshalls.com',
  'michaels': 'michaels.com',
  'barnes & noble': 'barnesandnoble.com',
  'foot locker': 'footlocker.com',
  'dick sporting goods': 'dickssportinggoods.com',

  // Everything else
  'city of new york': 'nyc.gov',
  'amc theatres': 'amctheatres.com',
  'regal cinemas': 'regmovies.com',
  'planet fitness': 'planetfitness.com',
  'lifetime': 'lifetime.life',
  'ymca': 'ymca.org',
}

/** Legal-entity noise that never appears in a domain. */
const SUFFIXES = /\b(inc|llc|l\.l\.c|corp|corporation|co|company|holdings|group|usa|us|ltd|limited|the)\b/gi

/**
 * Best-effort domain for a company name, or null when we should not guess.
 *
 * Deliberately conservative. Returning null costs us a logo; returning a
 * plausible-but-wrong domain costs us a card that shows a stranger's brand.
 */
export function domainForCompany(company: string | null | undefined): string | null {
  const raw = String(company ?? '').trim().toLowerCase()
  if (!raw) return null

  const curated = CURATED[raw]
  if (curated) return curated

  // Franchise and location noise: "Chipotle - Journal Square", "Target #1234"
  const head = raw.split(/\s+[-–—|]\s+|,|\s#/)[0].trim()
  if (CURATED[head]) return CURATED[head]

  // Location suffixes: "ShopRite of Bayonne", "YMCA at Hoboken". Only stripped
  // when what remains is a name we already know, so "Bank of America" cannot
  // collapse to "bank" and resolve to a stranger.
  const beforeOf = head.split(/\s+(?:of|at)\s+/)[0].trim()
  if (beforeOf !== head && CURATED[beforeOf]) return CURATED[beforeOf]

  const cleaned = head
    .replace(SUFFIXES, ' ')
    .replace(/[^a-z0-9&\s-]/g, '')
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return null

  const words = cleaned.split(' ')

  // Bail-outs. Each of these is a case where a guess is more likely to hit
  // somebody else's site than the employer's.
  if (cleaned.length < 3) return null          // "BJ", "Hy" — too short to be unique
  if (words.length > 3) return null            // long names rarely map to name.com
  if (/\b(school|district|county|city|town|borough|township|department)\b/.test(cleaned)) {
    return null                                 // government names are never name.com
  }

  return `${words.join('')}.com`
}
