/**
 * EMPLOYTEENS — Tier 1 opportunities: recurring competitions and programs
 *
 * The cheapest inventory that exists. Unlike a job req, which dies in days,
 * these recur on a predictable annual cycle, so one research pass produces an
 * asset that stays valid for a year. This is the mechanic that let EC Database
 * reach several hundred listings without a sourcing team.
 *
 * WHY THERE ARE NO HARDCODED DEADLINES
 *
 * Checked congressionalappchallenge.us on 2026-08-10: the student page still
 * advertised "The 2025 Congressional App Challenge launched on May 1st, 2025.
 * Students can enter through October 30th, 2025." In August 2026. The
 * organizers' own site was a year stale.
 *
 * So baking a date into this file would mean confidently displaying a wrong
 * one, which is the exact failure we criticised in EC Database (they ranked a
 * competition with an "Apply by Feb 24, 2027" chip first for a Jersey City
 * sophomore, in German, run out of Berlin). What IS reliable is the recurring
 * pattern: this thing opens in spring and closes in late autumn, every year.
 * So we store the pattern in `windowNote`, leave `deadline` null, and the UI
 * says "opens in May, closes late October — check the site for this year's
 * exact dates." Honest, and more useful than a stale date.
 *
 * ELIGIBILITY IS MANDATORY, NOT OPTIONAL
 *
 * Every entry declares delivery, eligible regions, and a grade range. The
 * database enforces this with a CHECK constraint for non-job rows. This is the
 * guard against the two failures we watched happen live: a German-language
 * competition and an Australia-and-New-Zealand-only stock game, both ranked
 * highly for a Jersey City teen, because neither had an eligibility field.
 *
 * COST IS STATED OR MARKED UNKNOWN
 *
 * Never guessed. A Hudson County family deciding whether their kid can do this
 * needs the truth, and "unconfirmed" is a truthful answer where a wrong number
 * is not.
 */

export interface OpportunitySource {
  title: string
  /** Organisation running it. Becomes `company` on the row. */
  org: string
  slug: string
  apply_url: string
  description: string

  kind: 'competition' | 'program' | 'volunteer' | 'internship' | 'org_role'
  delivery: 'in_person' | 'virtual' | 'hybrid'
  /** 'US' national, 'GLOBAL' open worldwide, or specific like 'US-NJ'. */
  eligible_regions: string[]
  language: string
  min_grade: number
  max_grade: number

  /** Null means genuinely free. Undefined means we could not confirm. */
  cost_cents?: number | null
  recurrence: 'annual' | 'seasonal' | 'rolling' | 'one_time'
  /** Plain-English description of the yearly cycle. Shown instead of a date. */
  windowNote: string
  /** Months the entry should be live. Empty means all year. */
  activeMonths?: number[]

  /** What finishing this actually produces. Drives evidence-strength sorting. */
  evidence_kind: 'hours' | 'title' | 'award' | 'reference' | 'income' | 'certificate'
  rung_from: number
  rung_to: number
  tags: string[]
}

const ALL_YEAR: number[] = []

export const OPPORTUNITY_SOURCES: OpportunitySource[] = [
  // ── Computer science and engineering ──────────────────────────────────
  {
    title: 'Congressional App Challenge',
    org: 'U.S. House of Representatives',
    slug: 'congressional-app-challenge',
    apply_url: 'https://www.congressionalappchallenge.us/students/',
    description:
      'Build an app and enter it in your own Congressional district. Because it is judged per district rather than nationally, the field is small and a first-time coder has a realistic shot — winners get displayed in the Capitol and invited to a reception in Washington. Free to enter, works solo or in a team, and any platform or language counts.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'Opens around May, entries close late October. Check the site for this year\'s exact dates.',
    activeMonths: [5, 6, 7, 8, 9, 10],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free', 'Virtual', 'Coding', 'Beginner friendly'],
  },
  {
    title: 'Technovation Girls',
    org: 'Technovation',
    slug: 'technovation-girls',
    apply_url: 'https://www.technovation.org/',
    description:
      'Teams of girls build a mobile app or AI project around a problem in their own community, with a volunteer mentor assigned to the team. The mentor is the valuable part: a named adult who works with you for months and can speak to what you actually did.',
    kind: 'competition',
    delivery: 'hybrid',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'Season typically runs autumn through spring, with submissions in late spring.',
    activeMonths: [9, 10, 11, 12, 1, 2, 3, 4],
    evidence_kind: 'reference',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free', 'Mentor included', 'Team project', 'Coding'],
  },
  {
    title: 'CS50: Introduction to Computer Science',
    org: 'Harvard University via edX',
    slug: 'cs50x',
    apply_url: 'https://cs50.harvard.edu/x/',
    description:
      'Harvard\'s intro CS course, free to audit and open to anyone with a laptop. Genuinely hard and genuinely respected. Be clear-eyed about what it proves though: it is open to everyone and self-paced, so finishing it shows you can teach yourself, not that anyone vouches for you.',
    kind: 'program',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Self-paced, starts whenever you do.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'certificate',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'Self-paced', 'Coding'],
  },

  // ── Business ───────────────────────────────────────────────────────────
  {
    title: 'DECA Competitive Events',
    org: 'DECA',
    slug: 'deca',
    apply_url: 'https://www.deca.org/high-school-programs/high-school-competitive-events/',
    description:
      'Business and marketing case competitions run through a school chapter. You start at districts, and states or ICDC is a national-level result you can name on an application. Requires your school to have a chapter, so step one is asking a business teacher.',
    kind: 'competition',
    delivery: 'in_person',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Chapter sign-ups in autumn, districts in winter, states in spring.',
    activeMonths: [8, 9, 10, 11, 12, 1, 2, 3],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['School chapter needed', 'Business', 'Competition'],
  },
  {
    title: 'Blue Ocean Student Entrepreneur Competition',
    org: 'Blue Ocean Student Entrepreneurs Corp',
    slug: 'blue-ocean-competition',
    apply_url: 'https://www.blueoceancompetition.org/',
    description:
      'Submit a five-minute pitch video for a business idea. Fully virtual, free, no chapter or teacher sponsor required, which makes it one of the few real business competitions a teen can enter entirely on their own.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'Submissions typically close in late winter.',
    activeMonths: [10, 11, 12, 1, 2],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free', 'Virtual', 'No sponsor needed', 'Business'],
  },
  {
    title: 'Diamond Challenge',
    org: 'University of Delaware Horn Entrepreneurship',
    slug: 'diamond-challenge',
    apply_url: 'https://diamondchallenge.org/',
    description:
      'Teams of two to four submit a written business or social venture concept, with finalists pitching live. Free to enter and open to any teen worldwide, no school sponsorship needed.',
    kind: 'competition',
    delivery: 'hybrid',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'Registration in autumn, written submissions in winter, finals in spring.',
    activeMonths: [9, 10, 11, 12, 1],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free', 'Team project', 'Business'],
  },

  // ── Health and medicine ────────────────────────────────────────────────
  {
    title: 'HOSA Competitive Events',
    org: 'HOSA Future Health Professionals',
    slug: 'hosa',
    apply_url: 'https://hosa.org/competitive-events/',
    description:
      'More than fifty health-science events, from Medical Law and Ethics to CPR and First Aid. Run through a school chapter, so ask a health or science teacher first. Placing at state is a verifiable result that separates real involvement from listing club membership.',
    kind: 'competition',
    delivery: 'in_person',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Chapter sign-ups in autumn, regionals and states in late winter and spring.',
    activeMonths: [8, 9, 10, 11, 12, 1, 2, 3],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['School chapter needed', 'Health', 'Competition'],
  },
  {
    title: 'Hospital teen volunteer program',
    org: 'Local hospitals',
    slug: 'hospital-teen-volunteer',
    apply_url: 'https://www.rwjbh.org/jersey-city-medical-center/patients-visitors/volunteer/',
    description:
      'Most hospitals run a structured teen volunteer programme with fixed weekly shifts. This is one of the strongest things on this list, because you finish with a named volunteer coordinator who knows your attendance record and will take a reference call. Requires an application, usually a health screening, and a term commitment.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NJ', 'US-NY'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'seasonal',
    windowNote: 'Summer intake usually recruits in spring; some sites run year-round.',
    activeMonths: [2, 3, 4, 5, 6],
    evidence_kind: 'reference',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free', 'In person', 'Builds a reference', 'Health'],
  },

  // ── Science and research ───────────────────────────────────────────────
  {
    title: 'Regeneron International Science and Engineering Fair',
    org: 'Society for Science',
    slug: 'regeneron-isef',
    apply_url: 'https://www.societyforscience.org/isef/',
    description:
      'The largest pre-college science competition in the world. You qualify through a local or regional affiliated fair rather than entering directly, so the real first step is finding your regional fair. A serious multi-month research commitment.',
    kind: 'competition',
    delivery: 'in_person',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Regional fairs run in late winter and spring; ISEF itself is in May.',
    activeMonths: [9, 10, 11, 12, 1, 2, 3],
    evidence_kind: 'award',
    rung_from: 2,
    rung_to: 3,
    tags: ['Research', 'Qualify through regionals', 'Science'],
  },
  {
    title: 'Science Olympiad',
    org: 'Science Olympiad',
    slug: 'science-olympiad',
    apply_url: 'https://www.soinc.org/',
    description:
      'Team science competition across roughly twenty-three events spanning biology, chemistry, physics, and engineering builds. Runs through a school team, and the variety means there is usually an event that fits whatever you are actually good at.',
    kind: 'competition',
    delivery: 'in_person',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Teams form in autumn, invitationals and regionals in winter, nationals in spring.',
    activeMonths: [8, 9, 10, 11, 12, 1, 2, 3],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['School team needed', 'Science', 'Team'],
  },

  // ── Writing, arts and history ──────────────────────────────────────────
  {
    title: 'Scholastic Art & Writing Awards',
    org: 'Alliance for Young Artists & Writers',
    slug: 'scholastic-art-writing',
    apply_url: 'https://www.artandwriting.org/',
    description:
      'The oldest and best-known creative competition for US teens, across twenty-eight categories of art and writing. Regional Gold Keys advance to national judging. There is a per-entry fee, though fee waivers are available and worth asking about.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 7,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Submissions open in September and close region by region in December and January.',
    activeMonths: [9, 10, 11, 12, 1],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['Fee waivers available', 'Art', 'Writing'],
  },
  {
    title: 'National History Day',
    org: 'National History Day',
    slug: 'national-history-day',
    apply_url: 'https://www.nhd.org/',
    description:
      'Research a historical topic and present it as a paper, exhibit, documentary, performance, or website. Advances from school to regional to state to national. The format range means it suits people who would rather build or film something than write an essay.',
    kind: 'competition',
    delivery: 'hybrid',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Topic announced in the autumn, contests run from winter through the national finals in June.',
    activeMonths: [9, 10, 11, 12, 1, 2, 3, 4],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['Research', 'Multiple formats', 'History'],
  },

  // ── Public service and civic ───────────────────────────────────────────
  {
    title: 'Library teen volunteer program',
    org: 'Jersey City Free Public Library',
    slug: 'jcfpl-teen-volunteer',
    apply_url: 'https://www.jclibrary.org/',
    description:
      'Shelving, programme help, and summer reading support. One of the very few structured roles genuinely open at 14 in Hudson County, and it has a real progression: consistent volunteers are often first in line for paid summer positions. The librarian who runs it becomes a reference.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 8,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Rolling, with the biggest intake before summer reading season.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'reference',
    rung_from: 0,
    rung_to: 3,
    tags: ['Free', 'Open at 14', 'Local', 'Builds a reference'],
  },
  {
    title: 'Junior Achievement programs',
    org: 'Junior Achievement of New Jersey',
    slug: 'junior-achievement-nj',
    apply_url: 'https://newjersey.ja.org/',
    description:
      'Work-readiness, entrepreneurship, and financial literacy programmes delivered in schools and through standalone events like company programmes and job shadow days. Free, and the business volunteers who run sessions are real professional contacts.',
    kind: 'program',
    delivery: 'hybrid',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 8,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Runs through the school year, varies by district.',
    activeMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5],
    evidence_kind: 'certificate',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Local', 'Work readiness'],
  },
]

/** Entries whose season is open this month. Empty activeMonths means always. */
export function inSeasonOpportunities(month = new Date().getMonth() + 1): OpportunitySource[] {
  return OPPORTUNITY_SOURCES.filter(
    (o) => !o.activeMonths || o.activeMonths.length === 0 || o.activeMonths.includes(month),
  )
}

export function outOfSeasonOpportunities(month = new Date().getMonth() + 1): OpportunitySource[] {
  return OPPORTUNITY_SOURCES.filter(
    (o) => o.activeMonths && o.activeMonths.length > 0 && !o.activeMonths.includes(month),
  )
}
