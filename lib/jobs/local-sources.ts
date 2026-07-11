/**
 * EMPLOYTEENS — Curated Hudson County Local Sources Directory
 *
 * WHY THIS EXISTS: the API sources (Adzuna, JSearch, ATS boards) structurally
 * cannot surface most jobs available to 14- and 15-year-olds. The employers
 * that actually hire younger teens in Hudson County — municipal recreation
 * departments, summer youth employment programs, libraries, WIOA youth
 * programs — do not post to ATS platforms or aggregators. They announce on
 * municipal websites, often seasonally.
 *
 * PRINCIPLE COMPLIANCE ("never manually maintain jobs"): this directory is
 * seeded from research ONCE per entry; after that it is maintained by the
 * same automation as every other source. Each entry is re-verified on every
 * ingest run (HTTP liveness + closed-application language via
 * verify-url.ts programPage mode), seasonal windows automatically activate/
 * deactivate entries, and clean-jobs deactivates anything whose page dies.
 * Nobody hand-edits live job rows.
 *
 * REMOVED 2026-07-09: JCFPL Teen Volunteer entry — unpaid volunteer
 * listings are out per product direction (paid work only).
 *
 * RESEARCH PROVENANCE (July 2026): every URL below was found and confirmed
 * live via web research. Age floors come from the programs' own published
 * requirements where stated. Key finding worth remembering: even Hudson
 * County's own youth programs floor at 15, not 14 (JC Next: 15–24,
 * Secaucus Rec: 15 by June 29, West New York SYEP: 15). Genuine 14-year-old
 * paths are AMC (14–17 per school work permit), JCFPL teen volunteering
 * (a volunteer-to-paid pathway), and case-by-case small food shops.
 */

export interface LocalSourceEntry {
  title: string
  company: string
  location: string
  city: string
  state: 'NJ'
  zip_code: string
  apply_url: string
  description: string
  min_age: number
  job_type: string
  /** User-facing structured tags shown as badges on the card */
  tags: string[]
  salary_min?: number
  salary_max?: number
  /**
   * Months (1–12) during which this entry should be live on the platform —
   * approximately the application window plus program ramp-up. Outside these
   * months the ingest route deactivates the row instead of re-verifying it.
   * Year-round entries list all 12 months.
   */
  activeMonths: number[]
}

const ALL_YEAR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export const LOCAL_SOURCES: LocalSourceEntry[] = [
  // ── Jersey City ────────────────────────────────────────────────────────
  {
    title: 'Summer Youth Employment',
    tags: ['Ages 15+', 'City program', 'Seasonal', '$17/hr'],
    company: 'City of Jersey City',
    location: 'Jersey City, NJ',
    city: 'Jersey City',
    state: 'NJ',
    zip_code: '07302',
    // Browser-verified 2026-07-10: the old URL was a stale 2022 news post
    // ("apply through March 6, 2022"). This is the current JC Next launch
    // page (posted 05/14/2026) with the live application link inside.
    apply_url: 'https://www.jerseycitynj.gov/news/mayor_solomon_launches___j_c_next_',
    description:
      'Jersey City\'s JC Next program places residents ages 15–24 in paid summer positions — roughly 700 slots at $17/hour, 25 hours/week, running July 6 through August 21. Selection prioritizes first-time workers, low-income youth, and students from underrepresented neighborhoods. The application link is on this page — a strong first job with real mentorship built in.',
    min_age: 15,
    job_type: 'seasonal',
    salary_min: 17,
    activeMonths: [2, 3, 4, 5, 6, 7],
  },
  // REMOVED 2026-07-11: AMC "Theatre Crew" entry pointed at the
  // amctheatres.com/careers/in-theatre LANDING page, not an exact
  // application — banned per product direction ("only exact application
  // links"). Replaced with the specific Clifton Commons posting below.
  {
    // Browser-verified 2026-07-11: EXACT posting on AMC's own careers site,
    // "Apply for this position" button, "Must be at least 14 years of age"
    // stated in the posting text, $15.92–16.42/hr, posted 07/10/2026.
    // Clifton is Passaic County (adjacent to Hudson, ~6 mi from North
    // Bergen) — the only verifiable exact-link 14+ posting found in-market.
    // Requisition URLs churn: when this closes, the nightly re-check will
    // deactivate it automatically.
    title: 'Theatre Crew',
    tags: ['Ages 14+', 'No experience needed', '$15.92–16.42/hr', 'Hiring now'],
    company: 'AMC Theatres',
    location: 'Clifton, NJ',
    city: 'Clifton',
    state: 'NJ',
    zip_code: '07014',
    apply_url: 'https://careers.amctheatres.com/crew/job/P1-2025323-14',
    description:
      'Crew at AMC Clifton Commons 16 (405 State Rt 3): tickets, concessions, ushering — cross-trained across all of it. $15.92–16.42/hr, free movies at any AMC nationwide, daily free popcorn, flexible scheduling. The posting states a minimum age of 14 — NJ working papers required (MyWorkingPapers.nj.gov).',
    min_age: 14,
    job_type: 'part-time',
    activeMonths: ALL_YEAR,
  },
  {
    // Browser-verified 2026-07-10: live Workstream posting, one specific
    // position, Apply button, pay shown. Posting states "at least 16 years
    // of age" (kitchen roles at this franchise are 18+).
    title: 'Front of House Team Member',
    tags: ['Hiring now', 'Part-time', '$15.95–17/hr', 'Closed Sundays'],
    company: 'Chick-fil-A Newport Centre',
    location: 'Jersey City, NJ',
    city: 'Jersey City',
    state: 'NJ',
    zip_code: '07310',
    apply_url: 'https://www.workstream.us/j/bf79ff6f/chick-fil-a/jersey-city-68721/front-of-house-team-member-cc8373ae?locale=en',
    description:
      'Front-of-house at Chick-fil-A Newport Centre (30 Mall Dr W): taking orders, serving guests, keeping the dining area sharp. $15.95–17/hr, flexible scheduling, closed Sundays, scholarship opportunities up to $2,500/year. Must be 16 by hire date.',
    min_age: 16,
    job_type: 'part-time',
    activeMonths: ALL_YEAR,
  },
  // ── Bayonne ────────────────────────────────────────────────────────────
  {
    title: 'Camp Counselor',
    tags: ['Ages 15+', 'City program', 'Seasonal'],
    company: 'City of Bayonne',
    location: 'Bayonne, NJ',
    city: 'Bayonne',
    state: 'NJ',
    zip_code: '07002',
    apply_url: 'https://www.bayonnenj.org/News/View/10502/division-of-recreation-summer-job-applications-available',
    description:
      'Bayonne\'s Division of Recreation hires camp counselors for its summer day camps and pool attendants/lifeguards for the Thomas DiDomenico Municipal Pool at 16th Street Park. Applications are typically due early April. Questions: Pete Amadeo, 201-858-6129.',
    min_age: 15,
    job_type: 'seasonal',
    activeMonths: [1, 2, 3, 4],
  },
  // ── Secaucus ───────────────────────────────────────────────────────────
  {
    title: 'Summer Camp Staff',
    tags: ['Ages 15+', 'City program', 'Seasonal', '$15.23/hr'],
    company: 'Town of Secaucus',
    location: 'Secaucus, NJ',
    city: 'Secaucus',
    state: 'NJ',
    zip_code: '07094',
    apply_url: 'https://www.secaucusnj.net/news/19686/Summer-Camp-Programs-Employment-Opportunities',
    description:
      'Secaucus Recreation hires summer camp staff (must be 15 by late June — no exceptions) at $15.23/hr for its six-week camp program. Duties include recreation and sports activities and supervising campers on field trips. Applications typically open in early spring.',
    min_age: 15,
    job_type: 'seasonal',
    salary_min: 15.23,
    activeMonths: [1, 2, 3, 4, 5],
  },
  // ── West New York ──────────────────────────────────────────────────────
  {
    title: 'Summer Youth Employment',
    tags: ['Ages 15+', 'City program', 'Seasonal'],
    company: 'Town of West New York',
    location: 'West New York, NJ',
    city: 'West New York',
    state: 'NJ',
    zip_code: '07093',
    apply_url: 'https://www.westnewyorknj.org/west-new-york-division-of-recreations-2026-summer-youth-employment/',
    description:
      'West New York\'s Division of Recreation runs a Summer Youth Employment program for residents 15 and up. Apply in person at 429 60th Street, Room 7 with a valid NJ MVC ID and Social Security card. Applications are typically due mid-April.',
    min_age: 15,
    job_type: 'seasonal',
    activeMonths: [1, 2, 3, 4],
  },
  // ── Union City (countywide services) ───────────────────────────────────
  {
    title: 'Youth Career Services',
    tags: ['Ages 16+', 'Free program', 'Job placement help'],
    company: 'HCST Community Resource Center',
    location: 'Union City, NJ',
    city: 'Union City',
    state: 'NJ',
    zip_code: '07087',
    // Browser-verified 2026-07-10: old hcstonline.org URL is a 404 (was
    // masked by a fetch timeout, which the programPage policy treated as
    // inconclusive). This county page is live and describes the same
    // Union City CRC services with application links.
    apply_url: 'https://www.hcnj.us/communityresources/hcst-resource-center/',
    description:
      'Hudson County Schools of Technology\'s Community Resource Center in Union City (satellites in Bayonne and East Newark) provides free skills training, career planning, and job search assistance, plus a diploma-prep program for out-of-school youth 16–24. Not a single job — a door to many, with a real counselor behind it.',
    min_age: 16,
    job_type: 'program',
    activeMonths: ALL_YEAR,
  },
  // TODO(research): confirmed program pages not yet found for Hoboken,
  // North Bergen, Kearny, Weehawken, Guttenberg, Harrison, and East Newark
  // recreation/youth employment. Do NOT add entries without a verified URL —
  // a fabricated or guessed URL is worse than a missing city. Next research
  // pass: Hoboken Dept of Community Development seasonal hiring, North Bergen
  // Parks & Rec summer staff, Kearny UEZ youth programs.
]

/** Entries whose activeMonths include the given month (1–12). */
export function inSeasonEntries(month: number): LocalSourceEntry[] {
  return LOCAL_SOURCES.filter((e) => e.activeMonths.includes(month))
}

/** Entries out of season for the given month — their rows get deactivated. */
export function outOfSeasonEntries(month: number): LocalSourceEntry[] {
  return LOCAL_SOURCES.filter((e) => !e.activeMonths.includes(month))
}
