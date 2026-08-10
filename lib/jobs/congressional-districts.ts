/**
 * EMPLOYTEENS — NJ and NY congressional districts, and App Challenge participation
 *
 * WHY THIS IS ENRICHMENT AND NOT THIRTY EXTRA LISTINGS
 *
 * The Congressional App Challenge is hosted per district, and a competitor's
 * directory lists it that way — "Congressional App Challenge, Utah Third
 * District" as its own row, with that Representative's office as the org. Do
 * that across 435 districts and one competition becomes 435 listings.
 *
 * That is how a directory reaches 789 entries without having 789 things in it,
 * and it is the reason our 34 looked so far behind. We are counting programs;
 * that count includes instances.
 *
 * We could trivially do the same and add 30 rows for NJ and NY. We are not
 * going to, because it would make the feed worse: thirty near-identical cards
 * for one competition, pushing genuinely different opportunities off the
 * screen. Inflating a number we then quote to ourselves is self-deception.
 *
 * Instead the district data enriches the single entry. A Jersey City teen sees
 * "Your representative, Robert Menendez in NJ-08, is participating" on one
 * card. That is more useful than thirty rows and it stays honest about being
 * one competition.
 *
 * Source: congressionalappchallenge.us participating-districts page, read
 * 2026-08-10. That page carried a modified date of 2026-08-03, so it is
 * current — unlike their student page, which still showed 2025 dates.
 * Participation is re-confirmed by each Member annually, so re-check each May.
 */

export interface District {
  /** e.g. 'NJ-08' */
  id: string
  state: 'NJ' | 'NY'
  number: number
  representative: string
  /** Hosting a 2026 App Challenge as of the source read date. */
  participatingInAppChallenge: boolean
  /** Towns in our market this district covers. Empty for out-of-market ones. */
  marketTowns: string[]
}

export const DISTRICTS: District[] = [
  // ── New Jersey ────────────────────────────────────────────────────────
  { id: 'NJ-01', state: 'NJ', number: 1, representative: 'Donald Norcross', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NJ-02', state: 'NJ', number: 2, representative: 'Jefferson Van Drew', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NJ-03', state: 'NJ', number: 3, representative: 'Herbert C. Conaway', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NJ-04', state: 'NJ', number: 4, representative: 'Christopher H. Smith', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NJ-05', state: 'NJ', number: 5, representative: 'Josh Gottheimer', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NJ-06', state: 'NJ', number: 6, representative: 'Frank Pallone', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NJ-07', state: 'NJ', number: 7, representative: 'Thomas H. Kean', participatingInAppChallenge: true, marketTowns: [] },
  // The one that matters most: Hudson County.
  { id: 'NJ-08', state: 'NJ', number: 8, representative: 'Robert Menendez', participatingInAppChallenge: true, marketTowns: ['Jersey City', 'Bayonne', 'Hoboken', 'Union City', 'West New York', 'Weehawken', 'Guttenberg', 'Harrison', 'Kearny', 'East Newark', 'Secaucus'] },
  { id: 'NJ-09', state: 'NJ', number: 9, representative: 'Nellie Pou', participatingInAppChallenge: true, marketTowns: ['North Bergen', 'Clifton', 'Paterson'] },
  { id: 'NJ-10', state: 'NJ', number: 10, representative: 'LaMonica McIver', participatingInAppChallenge: true, marketTowns: ['Newark', 'Elizabeth'] },
  // Not hosting as of the source read. A teen here can still enter via the
  // district they attend school in, which the organiser explicitly allows.
  { id: 'NJ-11', state: 'NJ', number: 11, representative: 'Mikie Sherrill', participatingInAppChallenge: false, marketTowns: ['Montclair'] },
  { id: 'NJ-12', state: 'NJ', number: 12, representative: 'Bonnie Watson Coleman', participatingInAppChallenge: true, marketTowns: [] },

  // ── New York ──────────────────────────────────────────────────────────
  { id: 'NY-01', state: 'NY', number: 1, representative: 'Nick LaLota', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-02', state: 'NY', number: 2, representative: 'Andrew R. Garbarino', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-03', state: 'NY', number: 3, representative: 'Thomas R. Suozzi', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-04', state: 'NY', number: 4, representative: 'Laura Gillen', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-05', state: 'NY', number: 5, representative: 'Gregory W. Meeks', participatingInAppChallenge: false, marketTowns: [] },
  { id: 'NY-06', state: 'NY', number: 6, representative: 'Grace Meng', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-07', state: 'NY', number: 7, representative: 'Nydia M. Velázquez', participatingInAppChallenge: false, marketTowns: [] },
  { id: 'NY-08', state: 'NY', number: 8, representative: 'Hakeem S. Jeffries', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-09', state: 'NY', number: 9, representative: 'Yvette D. Clarke', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-10', state: 'NY', number: 10, representative: 'Daniel S. Goldman', participatingInAppChallenge: false, marketTowns: [] },
  { id: 'NY-11', state: 'NY', number: 11, representative: 'Nicole Malliotakis', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-12', state: 'NY', number: 12, representative: 'Jerrold Nadler', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-13', state: 'NY', number: 13, representative: 'Adriano Espaillat', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-14', state: 'NY', number: 14, representative: 'Alexandria Ocasio-Cortez', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-15', state: 'NY', number: 15, representative: 'Ritchie Torres', participatingInAppChallenge: false, marketTowns: [] },
  { id: 'NY-16', state: 'NY', number: 16, representative: 'George Latimer', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-17', state: 'NY', number: 17, representative: 'Michael Lawler', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-18', state: 'NY', number: 18, representative: 'Patrick Ryan', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-19', state: 'NY', number: 19, representative: 'Josh Riley', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-20', state: 'NY', number: 20, representative: 'Paul Tonko', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-21', state: 'NY', number: 21, representative: 'Elise M. Stefanik', participatingInAppChallenge: false, marketTowns: [] },
  { id: 'NY-22', state: 'NY', number: 22, representative: 'John W. Mannion', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-23', state: 'NY', number: 23, representative: 'Nicholas A. Langworthy', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-24', state: 'NY', number: 24, representative: 'Claudia Tenney', participatingInAppChallenge: true, marketTowns: [] },
  { id: 'NY-25', state: 'NY', number: 25, representative: 'Joseph D. Morelle', participatingInAppChallenge: false, marketTowns: [] },
  { id: 'NY-26', state: 'NY', number: 26, representative: 'Timothy M. Kennedy', participatingInAppChallenge: false, marketTowns: [] },
]

/** Districts covering towns we actually serve. */
export const IN_MARKET_DISTRICTS = DISTRICTS.filter((d) => d.marketTowns.length > 0)

/**
 * District from a location string. Only Hudson County towns map cleanly to a
 * single district; NYC boroughs span several (Astoria alone sits in NY-14, not
 * NY-06 as a naive borough match suggests), so NY locations deliberately return
 * null. Conservative on purpose:
 * returns null rather than a wrong Representative's name, because telling a
 * teen to contact the wrong congressional office is worse than telling them
 * to look it up.
 */
export function districtForLocation(location?: string | null): District | null {
  if (!location) return null
  const l = location.toLowerCase()
  // Longest town names first so "West New York" is not caught by "New York".
  const ranked = [...IN_MARKET_DISTRICTS].sort(
    (a, b) => Math.max(...b.marketTowns.map((t) => t.length)) - Math.max(...a.marketTowns.map((t) => t.length)),
  )
  for (const d of ranked) {
    for (const town of d.marketTowns) {
      if (l.includes(town.toLowerCase())) return d
    }
  }
  return null
}

/**
 * The line shown on the Congressional App Challenge card. Returns null when we
 * cannot identify the district, so the UI falls back to the generic copy rather
 * than guessing.
 */
export function appChallengeNote(location?: string | null): string | null {
  const d = districtForLocation(location)
  if (!d) return null
  if (d.participatingInAppChallenge) {
    return `Your representative, ${d.representative} in ${d.id}, is hosting this. Smaller field than a national contest.`
  }
  return `${d.representative} in ${d.id} is not hosting this year, but you can enter through the district where you go to school.`
}

export const APP_CHALLENGE_COVERAGE = {
  nj: { participating: DISTRICTS.filter((d) => d.state === 'NJ' && d.participatingInAppChallenge).length, total: 12 },
  ny: { participating: DISTRICTS.filter((d) => d.state === 'NY' && d.participatingInAppChallenge).length, total: 26 },
  sourceReadOn: '2026-08-10',
}
