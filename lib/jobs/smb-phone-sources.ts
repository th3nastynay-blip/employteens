/**
 * EMPLOYTEENS — Call/Text-to-Apply Small Business Directory
 *
 * WHY THIS EXISTS: genuinely independent small businesses — the ones most
 * likely to give a teen a fast callback, per real product direction — almost
 * never have an online application system. They hire off a phone call, a
 * text, an email intro, or a sign in the window. verify-url.ts has nothing
 * to fetch for any of those, so this category can NEVER be auto-verified the
 * way every other job on the platform is (see lib/jobs/verify-url.ts,
 * lib/jobs/local-sources.ts for the URL-based equivalent of this file).
 *
 * SAFETY MODEL — read before touching this file:
 * A phone number or email is a much bigger trust surface to hand a
 * 14-year-old than a URL. A URL at least anchors to *some* public web
 * presence; a bare phone number or email doesn't. So every entry below
 * requires a REAL HUMAN to have:
 *   1. Called, texted, or emailed and confirmed it reaches the named business
 *   2. Confirmed they are actually, currently hiring for a teen-appropriate role
 *   3. Confirmed (or corrected) the min_age for that specific role
 *   4. Noted which channel (call/text/email) the business actually prefers —
 *      set apply_method to THAT, not whatever's most common in this file
 * ...before humanVerifiedAt is set. An entry with humanVerifiedAt === null is
 * INERT — smb-phone-ingest.ts's callableEntries() filter means it can never
 * reach the jobs table by accident, no matter what else is filled in.
 *
 * humanReverifyBy enforces re-confirmation — keep it ≤ 21 days from
 * humanVerifiedAt. Past that date, the nightly run (via ingest-pipeline.ts's
 * alwaysVerify mode) deactivates the row automatically until someone calls
 * again and bumps both dates. There is no automated liveness signal for a
 * phone number the way there is for a URL, so this expiry is the entire
 * safety net between "confirmed once" and "confirmed recently."
 *
 * CURRENT STATE (2026-07-21): 22 entries covering Jersey City, Bayonne,
 * Union City, Hoboken, North Bergen, West New York, Secaucus, Kearny,
 * Guttenberg, Weehawken, Harrison (Hudson County — East Newark still
 * outstanding, thin/no search results), plus Astoria, the Bronx, Park
 * Slope/Brooklyn, and Staten Island (NYC — Manhattan still outstanding).
 * Every entry is a RESEARCHED CANDIDATE — name, address, and phone
 * cross-checked against a public business listing (Yelp, see
 * source_listing) so the number is at least confirmed to belong to that
 * business. NONE have been called yet — I can't place phone calls.
 * humanVerifiedAt is null on all of them BY DESIGN. To bring one live: call
 * the number, confirm items 1–3 above, then fill in humanVerifiedAt
 * (today), humanVerifiedBy (your name), and humanReverifyBy (≤21 days out).
 * Do not fill these in without actually making the call — that defeats the
 * entire point of this file.
 *
 * Explicitly excluded from this directory: any recognizable regional or
 * national chain/franchise brand, even a single, locally-owned location of
 * one. Product direction (2026-07-21) is genuinely independent businesses
 * only — chains belong in the normal Workstream/ATS-based ingest sources,
 * not here.
 */

export interface SmbPhoneEntry {
  title: string
  company: string
  location: string
  city: string
  state: 'NJ' | 'NY'
  zip_code: string
  /** E.164 — e.g. "+12014349453". Required for apply_method 'call'/'text'. */
  phone?: string
  /** Human-readable, shown alongside the tel:/sms: link — e.g. "(201) 434-9453" */
  phone_display?: string
  /** Required for apply_method 'email'. */
  email?: string
  /**
   * 'call'/'text' both dial `phone` — smb-phone-ingest.ts picks tel: vs sms:
   * from this field. 'email' opens a pre-filled mailto: to `email`. Set
   * whichever channel the business actually said they prefer when you
   * called/emailed to verify them — don't default to 'call' just because
   * that's what's most common in this file.
   */
  apply_method: 'call' | 'text' | 'email'
  contact_note: string
  min_age: number
  job_type: string
  tags: string[]
  /** Public listing used to confirm this phone/email belongs to this business */
  source_listing: string
  /** Set ONLY after a real human contact confirms current teen hiring. Null = inert. */
  humanVerifiedAt: string | null
  humanVerifiedBy: string | null
  /** Required alongside humanVerifiedAt — keep ≤21 days from it */
  humanReverifyBy: string | null
}

export const SMB_PHONE_SOURCES: SmbPhoneEntry[] = [
  // ── Jersey City ────────────────────────────────────────────────────────
  {
    title: 'Counter / Kitchen Help',
    company: 'Prince of Pizza',
    location: '763 Bergen Ave, Jersey City, NJ 07306',
    city: 'Jersey City',
    state: 'NJ',
    zip_code: '07306',
    phone: '+12014349453',
    phone_display: '(201) 434-9453',
    apply_method: 'call',
    contact_note: 'Family-owned since 1967. Ask for the manager about part-time counter or kitchen help; confirm current age requirement — likely 16+ if the role touches the oven or slicer.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/prince-of-pizza-jersey-city',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  {
    title: 'Counter / Kitchen Help',
    company: "Gino's Pizzeria & Restaurant",
    location: '380 Central Ave, Jersey City, NJ 07307',
    city: 'Jersey City',
    state: 'NJ',
    zip_code: '07307',
    phone: '+12016596464',
    phone_display: '(201) 659-6464',
    apply_method: 'call',
    contact_note: 'Family-owned Jersey City pizzeria/restaurant. Ask about counter or busser roles for a teen; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/ginos-pizzeria-jersey-city-3',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── Bayonne ────────────────────────────────────────────────────────────
  {
    title: 'Counter / Kitchen Help',
    company: "San Vito's Restaurant & Pizzeria",
    location: '406 Broadway, Bayonne, NJ 07002',
    city: 'Bayonne',
    state: 'NJ',
    zip_code: '07002',
    phone: '+12018582448',
    phone_display: '(201) 858-2448',
    apply_method: 'call',
    contact_note: 'Family-owned-and-operated Bayonne pizzeria. Ask about part-time counter help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/lucianos-san-vito-restaurant-and-pizzeria-bayonne',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  {
    title: 'Deli Counter Help',
    company: "Benanti's Italian Delicatessen",
    location: '16 W 22nd St, Bayonne, NJ 07002',
    city: 'Bayonne',
    state: 'NJ',
    zip_code: '07002',
    phone: '+12014375525',
    phone_display: '(201) 437-5525',
    apply_method: 'call',
    contact_note: 'Independent Italian deli. Ask about counter/stock help; confirm whether the role involves the slicer (affects legal min age).',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/benantis-italian-delicatessen-bayonne',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── Union City ─────────────────────────────────────────────────────────
  {
    title: 'Counter / Kitchen Help',
    company: 'Termini Pizzeria',
    location: '4107 Bergenline Ave, Union City, NJ 07087',
    city: 'Union City',
    state: 'NJ',
    zip_code: '07087',
    phone: '+12018667336',
    phone_display: '(201) 866-7336',
    apply_method: 'call',
    contact_note: 'Family-run since 1985. Ask about part-time counter help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/termini-pizzeria-union-city',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  {
    title: 'Deli Counter Help',
    company: 'La Bella Salumeria Delicatessen',
    location: '2308 Bergenline Ave, Union City, NJ 07087',
    city: 'Union City',
    state: 'NJ',
    zip_code: '07087',
    phone: '+12018673065',
    phone_display: '(201) 867-3065',
    apply_method: 'call',
    contact_note: 'Family-owned Italian deli since 1976. Ask about counter/stock help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/la-bella-salumeria-delicatessen-union-city',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── Hoboken ────────────────────────────────────────────────────────────
  {
    title: 'Deli / Grocery Help',
    company: 'Delight Deli & Grocery',
    location: '56 Monroe St, Hoboken, NJ 07030',
    city: 'Hoboken',
    state: 'NJ',
    zip_code: '07030',
    phone: '+12019429444',
    phone_display: '(201) 942-9444',
    apply_method: 'call',
    contact_note: 'Independent Hoboken deli/grocery. Ask about counter or stock help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/delight-deli-and-grocery-hoboken',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── Astoria, Queens ────────────────────────────────────────────────────
  {
    title: 'Counter / Kitchen Help',
    company: 'Astoria Family Pizza',
    location: '19-27 Ditmars Blvd, Astoria, NY 11105',
    city: 'Astoria',
    state: 'NY',
    zip_code: '11105',
    phone: '+17184339601',
    phone_display: '(718) 433-9601',
    apply_method: 'call',
    contact_note: 'Independent Astoria pizzeria. Ask about part-time counter help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/astoria-family-pizza-astoria',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  {
    title: 'Deli Counter Help',
    company: "Rosario's",
    location: '22-55 31st St, Astoria, NY 11105',
    city: 'Astoria',
    state: 'NY',
    zip_code: '11105',
    phone: '+17187282920',
    phone_display: '(718) 728-2920',
    apply_method: 'call',
    contact_note: 'Independent Astoria deli, est. 1986. Ask about counter/stock help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: "https://www.yelp.com/biz/rosarios-astoria-2",
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── Bronx ──────────────────────────────────────────────────────────────
  {
    title: 'Counter / Kitchen Help',
    company: 'Family Pizza Restaurant',
    location: '3363 Baychester Ave, Bronx, NY 10469',
    city: 'Bronx',
    state: 'NY',
    zip_code: '10469',
    phone: '+17184844970',
    phone_display: '(718) 484-4970',
    apply_method: 'call',
    contact_note: 'Independent Bronx pizzeria. Ask about part-time counter help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/family-pizza-restaurant-bronx',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── North Bergen ───────────────────────────────────────────────────────
  {
    title: 'Counter / Kitchen Help',
    company: 'Palermo Ristorante & Pizzeria',
    location: '7407 Broadway, North Bergen, NJ 07047',
    city: 'North Bergen',
    state: 'NJ',
    zip_code: '07047',
    phone: '+12018618333',
    phone_display: '(201) 861-8333',
    apply_method: 'call',
    contact_note: 'Family-owned since 1982. Ask about part-time counter help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/palermo-ristorante-and-pizzeria-north-bergen-3',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  {
    title: 'Counter / Kitchen Help',
    company: "Frank's Pizzeria",
    location: '4410 Bergen Tpke, North Bergen, NJ 07047',
    city: 'North Bergen',
    state: 'NJ',
    zip_code: '07047',
    phone: '+12018663267',
    phone_display: '(201) 866-3267',
    apply_method: 'call',
    contact_note: 'Mom-and-pop pizza shop since 1985. Ask about part-time counter help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/franks-pizzeria-north-bergen',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  {
    title: 'Deli Counter Help',
    company: 'Cuomo & Sons Deli',
    location: '7709 Broadway, North Bergen, NJ 07047',
    city: 'North Bergen',
    state: 'NJ',
    zip_code: '07047',
    phone: '+12018696913',
    phone_display: '(201) 869-6913',
    apply_method: 'call',
    contact_note: 'Independent North Bergen deli. Ask about counter/stock help; confirm whether the role involves the slicer (affects legal min age).',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/cuomo-and-sons-deli-north-bergen',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── West New York ──────────────────────────────────────────────────────
  {
    title: 'Counter / Kitchen Help',
    company: "Sal's Pizza Bar",
    location: '6127 Bergenline Ave, West New York, NJ 07093',
    city: 'West New York',
    state: 'NJ',
    zip_code: '07093',
    phone: '+12018681999',
    phone_display: '(201) 868-1999',
    apply_method: 'call',
    contact_note: 'Family-owned since 1972. Ask about part-time counter help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/sals-pizzeria-west-new-york-3',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── Secaucus ───────────────────────────────────────────────────────────
  {
    title: 'Counter / Kitchen Help',
    company: 'Amadeo Pizzeria',
    location: '1536 Paterson Plank Rd, Secaucus, NJ 07094',
    city: 'Secaucus',
    state: 'NJ',
    zip_code: '07094',
    phone: '+12014145566',
    phone_display: '(201) 414-5566',
    apply_method: 'call',
    contact_note: 'Family recipes passed down 30+ years. Ask about part-time counter help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/amadeo-pizzeria-secaucus',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  {
    title: 'Deli Counter Help',
    company: "Giovanni's Deli",
    location: '267 Centre Ave, Secaucus, NJ 07094',
    city: 'Secaucus',
    state: 'NJ',
    zip_code: '07094',
    phone: '+12016175100',
    phone_display: '(201) 617-5100',
    apply_method: 'call',
    contact_note: 'Independent Secaucus deli. Ask about counter/stock help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/giovannis-deli-secaucus',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── Kearny ─────────────────────────────────────────────────────────────
  {
    title: 'Deli Counter Help',
    company: 'Kearny Deli Cafe & Restaurant',
    location: '751 Kearny Ave, Kearny, NJ 07032',
    city: 'Kearny',
    state: 'NJ',
    zip_code: '07032',
    phone: '+12019973691',
    phone_display: '(201) 997-3691',
    apply_method: 'call',
    contact_note: 'Family-run. Ask about counter help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/kearny-deli-cafe-and-restaurant-kearny-2',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── Guttenberg ─────────────────────────────────────────────────────────
  {
    title: 'Counter / Kitchen Help',
    company: 'Father & Son Pizzeria',
    location: '6810 Bergenline Ave, Guttenberg, NJ 07093',
    city: 'Guttenberg',
    state: 'NJ',
    zip_code: '07093',
    phone: '+12018693336',
    phone_display: '(201) 869-3336',
    apply_method: 'call',
    contact_note: 'Independent Guttenberg pizzeria. Ask about part-time counter help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/father-and-son-pizzeria-guttenberg',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── Weehawken ──────────────────────────────────────────────────────────
  {
    title: 'Deli / Grocery Help',
    company: "Moe's Deli & Grocery",
    location: '2500 Palisade Ave, Weehawken, NJ 07086',
    city: 'Weehawken',
    state: 'NJ',
    zip_code: '07086',
    phone: '+12018672002',
    phone_display: '(201) 867-2002',
    apply_method: 'call',
    contact_note: 'Independent Weehawken deli/grocery. Ask about counter or stock help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/moes-deli-and-grocery-weehawken',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── Harrison ───────────────────────────────────────────────────────────
  {
    title: 'Deli Counter Help',
    company: "Hinze's Deli & Catering",
    location: '533 Harrison Ave, Harrison, NJ 07029',
    city: 'Harrison',
    state: 'NJ',
    zip_code: '07029',
    phone: '+19734844678',
    phone_display: '(973) 484-4678',
    apply_method: 'call',
    contact_note: 'Independent deli/caterer since 1981. Ask about counter help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/hinzes-deli-and-catering-harrison',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── Park Slope, Brooklyn ───────────────────────────────────────────────
  {
    title: 'Counter / Kitchen Help',
    company: 'La Villa Pizzeria',
    location: '261 5th Ave, Brooklyn, NY 11215',
    city: 'Brooklyn',
    state: 'NY',
    zip_code: '11215',
    phone: '+17184999888',
    phone_display: '(718) 499-9888',
    apply_method: 'call',
    contact_note: 'Family-run 40+ years. Ask about part-time counter help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://lartedellapizzabrooklyn.com/',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // ── Staten Island ──────────────────────────────────────────────────────
  {
    title: 'Deli Counter Help',
    company: 'Towne Deli & Pizzeria',
    location: '5373 Arthur Kill Rd, Staten Island, NY 10307',
    city: 'Staten Island',
    state: 'NY',
    zip_code: '10307',
    phone: '+17182271985',
    phone_display: '(718) 227-1985',
    apply_method: 'call',
    contact_note: 'Family-owned 50+ years, Tottenville. Ask about counter help; confirm age requirement on the call.',
    min_age: 16,
    job_type: 'part-time',
    tags: ['Family-owned', 'Call to apply'],
    source_listing: 'https://www.yelp.com/biz/towne-deli-staten-island',
    humanVerifiedAt: null,
    humanVerifiedBy: null,
    humanReverifyBy: null,
  },
  // TODO(research): Manhattan and East Newark still need independent-
  // business candidates — Manhattan search returned no clean phone-number
  // matches this pass. Same rule as everywhere else in this file: do not
  // add an entry without a real cross-checked phone number and
  // source_listing — a guessed number is worse than a missing city.
]

/** Entries with a completed human phone-verification — the only ones eligible to ingest. */
export function callableEntries(): SmbPhoneEntry[] {
  return SMB_PHONE_SOURCES.filter((e) => e.humanVerifiedAt !== null)
}
