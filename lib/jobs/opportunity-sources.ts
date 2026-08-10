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
  /**
   * A real deadline, but ONLY when read from the organiser's own site, with the
   * date we read it. Never from memory and never carried over from last year.
   *
   * The ban on hardcoded dates exists because congressionalappchallenge.us was
   * still advertising 2025 dates in August 2026. It is not a ban on accuracy:
   * when the source page is demonstrably current we should say so, and the
   * `verifiedOn` stamp is what lets the UI age it out gracefully ("we checked
   * this in August") instead of asserting it forever.
   */
  deadline?: { date: string; verifiedOn: string; source: string }
  /** Months the entry should be live. Empty means all year. */
  activeMonths?: number[]

  /** What finishing this actually produces. Drives evidence-strength sorting. */
  evidence_kind: 'hours' | 'title' | 'award' | 'reference' | 'income' | 'certificate'
  /**
   * Is there a named human who oversees you and would take a reference call?
   *
   * This, not the delivery format, is what separates a reference from a
   * certificate. Crisis Text Line is virtual and rolling and still produces a
   * real reference, because there is an application, 30 hours of training, and
   * a supervisor. MIT OpenCourseWare is also virtual and rolling and produces
   * nothing of the kind, because nobody there knows you exist.
   *
   * A test asserts evidence_kind 'reference' is only ever claimed when this is
   * true. That is the guard against a ladder whose top rungs are decorative.
   */
  supervised?: boolean
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
    windowNote: 'Opens around May, entries close late October.',
    // Read from the organiser's participating-districts page on 2026-08-10.
    // That page carried a modified date of 2026-08-03, so unlike their student
    // page (which still showed 2025 dates) this one is demonstrably current.
    deadline: {
      date: '2026-10-26',
      verifiedOn: '2026-08-10',
      source: 'https://www.congressionalappchallenge.us/students/participating-districts/',
    },
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
    supervised: true,
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
    supervised: true,
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
      'Shelving, craft sessions, reading with younger kids, and summer reading support. One of the very few structured roles genuinely open at 14 in Hudson County, and the easiest on this list to actually start. It has a real progression too: consistent volunteers are often first in line for paid summer positions, and the librarian who runs it becomes a reference who has watched your attendance for months.',
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
    supervised: true,
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

// ─────────────────────────────────────────────────────────────────────────────
// VOLUNTEERING AND TUTORING
//
// Landscape check against ecdatabase.org's public directory, 2026-08-10:
// Volunteering and Tutoring is 388 of their 789 listings, nearly half, and by
// far their largest category. It is also the category that actually produces a
// reference rather than a certificate, which is the rung-3 hinge.
//
// Two gaps in their coverage we can fill:
//   - Their grade filter only offers 9 through 12. An 8th grader is unserved.
//   - 711 of 789 are US-wide or foreign. Almost nothing is Hudson County local,
//     and local in-person is precisely where a named adult comes from.
//
// So this block skews local, free, open below 9th grade, and reference-producing.
// ─────────────────────────────────────────────────────────────────────────────

OPPORTUNITY_SOURCES.push(
  {
    title: 'Animal shelter volunteer',
    org: 'Liberty Humane Society',
    slug: 'liberty-humane-volunteer',
    apply_url: 'https://libertyhumane.org/volunteer/',
    description:
      'Dog walking, cat socialising, laundry, and adoption event help at Jersey City\'s open-intake shelter. Teen volunteers usually need a parent to co-register and commit to a regular shift. The volunteer coordinator tracks attendance, which is what turns this into a reference rather than a nice afternoon.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 8,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Rolling intake, with orientation sessions run periodically.',
    activeMonths: ALL_YEAR,
    supervised: true,
    evidence_kind: 'reference',
    rung_from: 0,
    rung_to: 3,
    tags: ['Free', 'Local', 'Animals', 'Builds a reference'],
  },
  {
    title: 'Food bank volunteer shifts',
    org: 'Community FoodBank of New Jersey',
    slug: 'cfbnj-volunteer',
    apply_url: 'https://cfbnj.org/volunteer/',
    description:
      'Sorting and packing shifts at the Hillside warehouse and at mobile distributions. Shifts are bookable online, minors need a guardian waiver, and groups are welcome, which makes it one of the easiest first volunteer experiences to actually start. Hours are logged and certifiable.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 7,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Shifts posted continuously; busiest around the holidays.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Local', 'Bookable online', 'Hours logged'],
  },
  {
    title: 'Parks and recreation program aide',
    org: 'Hudson County Parks',
    slug: 'hudson-county-parks-volunteer',
    apply_url: 'https://www.hudsoncountynj.org/departments/parks-and-community-services/',
    description:
      'Helping run youth sports, park clean-ups, and seasonal events. Rec departments are one of the very few places genuinely used to working with under-16s, and a season of consistent Saturdays gets you a supervisor who knows your name.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 8,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'seasonal',
    windowNote: 'Spring and summer programming; recruiting usually starts in late winter.',
    activeMonths: [2, 3, 4, 5, 6, 7, 8],
    supervised: true,
    evidence_kind: 'reference',
    rung_from: 0,
    rung_to: 3,
    tags: ['Free', 'Local', 'Open under 16', 'Builds a reference'],
  },
  {
    title: 'Peer tutoring through your school',
    org: 'Your high school',
    slug: 'school-peer-tutoring',
    apply_url: 'https://www.nationalhonorsociety.org/',
    description:
      'The most underrated thing on this list. Nearly every school runs peer tutoring or a homework help centre, it takes one conversation with a counsellor or department head to join, and the teacher who supervises it becomes a reference who has watched you work weekly for a year. Free, no travel, no application.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NJ', 'US-NY'],
    language: 'en',
    min_grade: 8,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Ask during the school year; easiest to join at the start of a term.',
    activeMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5],
    supervised: true,
    evidence_kind: 'reference',
    rung_from: 0,
    rung_to: 3,
    tags: ['Free', 'No travel', 'Open under 16', 'Builds a reference'],
  },
  {
    title: 'Senior centre volunteer',
    org: 'Local senior centres',
    slug: 'senior-centre-volunteer',
    apply_url: 'https://www.hudsoncountynj.org/departments/health-and-human-services/',
    description:
      'Tech help, meal service, and activity assistance at county and municipal senior centres. Chronically short of volunteers, welcoming to younger teens, and the work is genuinely useful. Teaching someone to use a phone is a real skill you can describe later.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 8,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Year-round, arranged directly with the centre.',
    activeMonths: ALL_YEAR,
    supervised: true,
    evidence_kind: 'reference',
    rung_from: 0,
    rung_to: 3,
    tags: ['Free', 'Local', 'Open under 16', 'Builds a reference'],
  },
  {
    title: 'Museum teen program',
    org: 'Liberty Science Center',
    slug: 'liberty-science-teen',
    apply_url: 'https://lsc.org/',
    description:
      'Teen volunteer and explainer roles helping visitors with exhibits and demonstrations. Competitive, structured, and one of the more impressive local placements because you end up presenting science to strangers all day, which is a genuinely hard skill.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'seasonal',
    windowNote: 'Summer cohort recruits in late winter and spring.',
    activeMonths: [1, 2, 3, 4, 5],
    supervised: true,
    evidence_kind: 'reference',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free', 'Local', 'Science', 'Builds a reference'],
  },
  // ── NJ and NYC specific programs ──────────────────────────────────────
  {
    title: 'NJ Governor\'s School',
    org: 'New Jersey Governor\'s School',
    slug: 'nj-governors-school',
    apply_url: 'https://njgs.org/',
    description:
      'Free residential summer programs for NJ high school juniors in engineering, the sciences, and the environment. Highly selective and nominated through your school, so the first step is asking a counsellor early in junior year rather than applying directly.',
    kind: 'program',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 11,
    max_grade: 11,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'School nominations happen in winter for a summer program.',
    activeMonths: [11, 12, 1, 2, 3],
    evidence_kind: 'title',
    rung_from: 2,
    rung_to: 3,
    tags: ['Free', 'NJ only', 'Selective', 'Residential'],
  },
  {
    title: 'Pre-college summer programs',
    org: 'NJIT, Rutgers and Stevens',
    slug: 'nj-precollege-summer',
    apply_url: 'https://www.njit.edu/precollege/',
    description:
      'Short summer courses and engineering camps run by NJ universities. Quality is good and being on a campus helps demystify college. Be careful with cost: some are free or grant-funded and others run into the thousands, so check the specific program before getting attached.',
    kind: 'program',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Applications open in late winter for summer sessions.',
    activeMonths: [1, 2, 3, 4, 5],
    evidence_kind: 'certificate',
    rung_from: 1,
    rung_to: 2,
    tags: ['Cost varies', 'Local', 'Campus based'],
  },
  {
    title: 'Ladders for Leaders paid internship',
    org: 'NYC Department of Youth & Community Development',
    slug: 'nyc-ladders-for-leaders',
    apply_url: 'https://www.nyc.gov/site/dycd/services/jobs-internships/ladders-for-leaders.page',
    description:
      'NYC\'s paid summer internship program placing teens in real companies after a pre-employment training course. Genuinely paid, genuinely competitive, and the training itself is useful. Requires NYC residency, so check before investing time in the application.',
    kind: 'internship',
    delivery: 'in_person',
    eligible_regions: ['US-NY'],
    language: 'en',
    min_grade: 10,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'Applications typically open in the new year for a summer placement.',
    activeMonths: [1, 2, 3],
    evidence_kind: 'income',
    rung_from: 1,
    rung_to: 6,
    tags: ['Paid', 'NYC residents only', 'Competitive'],
  },
  {
    title: 'Summer Youth Employment Program',
    org: 'NYC DYCD',
    slug: 'nyc-syep',
    apply_url: 'https://www.nyc.gov/site/dycd/services/jobs-internships/summer-youth-employment-program-syep.page',
    description:
      'New York City\'s large paid summer jobs program for ages 14 to 24, allocated partly by lottery. One of the few genuinely paid options open at 14 anywhere in the region. NYC residency required.',
    kind: 'internship',
    delivery: 'in_person',
    eligible_regions: ['US-NY'],
    language: 'en',
    min_grade: 8,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'Applications open in late winter and close in the spring; partly a lottery.',
    activeMonths: [1, 2, 3, 4],
    evidence_kind: 'income',
    rung_from: 0,
    rung_to: 6,
    tags: ['Paid', 'Open at 14', 'NYC residents only', 'Lottery'],
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// VIRTUAL AND NATIONAL
//
// Virtual carries no distance cost, which makes it the answer to thin local
// supply: a 14-year-old in Bayonne with no working papers and no way to get
// anywhere can start most of these tonight. But virtual is NOT the same as
// "open to everyone" — every entry still declares eligible_regions, because
// that assumption is exactly what put an Australia-and-New-Zealand-only stock
// game and a German-language Berlin competition in front of a Jersey City
// sophomore on the site we studied.
//
// Evidence honesty applies harder here. Open self-paced courses are marked
// 'certificate', not 'reference'. They prove you can teach yourself. They do
// not produce a human who will pick up the phone, and a test enforces that.
// ─────────────────────────────────────────────────────────────────────────────

OPPORTUNITY_SOURCES.push(
  {
    title: 'MIT OpenCourseWare',
    org: 'Massachusetts Institute of Technology',
    slug: 'mit-ocw',
    apply_url: 'https://ocw.mit.edu/',
    description:
      'Full MIT course materials, free, no registration, no deadline. Lecture videos, problem sets, and exams across essentially every subject. Undergraduate level, so expect it to be hard, and expect to need to fill gaps as you go. Nothing here is certified, which means it is worth exactly as much as what you build with it.',
    kind: 'program',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Always open, entirely self-paced.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'certificate',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'Self-paced', 'No signup'],
  },
  {
    title: 'Khan Academy',
    org: 'Khan Academy',
    slug: 'khan-academy',
    apply_url: 'https://www.khanacademy.org/',
    description:
      'Free courses across maths, science, economics, and test prep, pitched at exactly the level most high schoolers need. The most useful thing on here for filling an actual gap rather than decorating an application, and the official SAT practice is free.',
    kind: 'program',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Always open, entirely self-paced.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'certificate',
    rung_from: 0,
    rung_to: 1,
    tags: ['Free', 'Virtual', 'Self-paced', 'Test prep'],
  },
  {
    title: 'freeCodeCamp certifications',
    org: 'freeCodeCamp',
    slug: 'freecodecamp',
    apply_url: 'https://www.freecodecamp.org/',
    description:
      'Free, project-based web development certifications. Each one ends with five projects you actually built and can link to, which is the part that matters — the certificate is worth little, the portfolio is worth a lot when you are applying for anything technical.',
    kind: 'program',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 7,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Always open, entirely self-paced.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'certificate',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'Portfolio projects', 'Coding'],
  },
  {
    title: 'Smithsonian Digital Volunteers',
    org: 'Smithsonian Institution',
    slug: 'smithsonian-transcription',
    apply_url: 'https://transcription.si.edu/',
    description:
      'Transcribe real historical documents from the Smithsonian collections, from home, in whatever time you have. No minimum commitment and no age gate. Genuinely useful work, and one of the very few virtual volunteering options that is not a thin wrapper on a course.',
    kind: 'volunteer',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Always open, contribute whenever you like.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'No age limit', 'Volunteering'],
  },
  {
    title: 'Zooniverse citizen science',
    org: 'Zooniverse',
    slug: 'zooniverse',
    apply_url: 'https://www.zooniverse.org/',
    description:
      'Classify galaxies, transcribe field notes, or tag wildlife camera footage for real research projects. Contributions feed published papers, and some projects credit volunteers. Start in five minutes with no application.',
    kind: 'volunteer',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Always open.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'Research', 'Start today'],
  },
  {
    title: 'Crisis Text Line volunteer counsellor',
    org: 'Crisis Text Line',
    slug: 'crisis-text-line',
    apply_url: 'https://www.crisistextline.org/become-a-volunteer/',
    description:
      'Serious, structured volunteering with roughly 30 hours of real training and a supervisor. Minimum age is 18, so this is one to plan for rather than apply to now, but it is worth knowing about early because the training and the reference are among the strongest anything on this list produces.',
    kind: 'volunteer',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 12,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Rolling cohorts. Note the minimum age is 18.',
    activeMonths: ALL_YEAR,
    supervised: true,
    evidence_kind: 'reference',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free', 'Virtual', '18+ only', 'Real training'],
  },
  {
    title: 'UPchieve free online tutoring volunteer',
    org: 'UPchieve',
    slug: 'upchieve',
    apply_url: 'https://upchieve.org/volunteer',
    description:
      'Tutor low-income students in maths and science, on demand, from home. Volunteers must be 16 or older and pass a subject check. Hours are tracked and certified, and there is a real coordinator, which puts it a step above most virtual volunteering.',
    kind: 'volunteer',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 11,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Rolling applications. Minimum age 16.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'hours',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free', 'Virtual', 'Tutoring', 'Hours certified'],
  },
  {
    title: 'National Novel Writing Month',
    org: 'NaNoWriMo Young Writers Program',
    slug: 'nanowrimo-ywp',
    apply_url: 'https://ywp.nanowrimo.org/',
    description:
      'Set your own word-count goal and write a novel draft in November, with a young writers version built for under-18s. Free, no selection, and finishing is entirely within your control, which makes it one of the few things on this list where effort alone guarantees a result.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'Runs every November, with prep in October.',
    activeMonths: [10, 11],
    evidence_kind: 'certificate',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'Writing', 'No selection'],
  },
  {
    title: 'John Locke Institute Essay Competition',
    org: 'John Locke Institute',
    slug: 'john-locke-essay',
    apply_url: 'https://www.johnlockeinstitute.com/essay-competition',
    description:
      'Write an essay on a set question in philosophy, politics, economics, history, psychology, theology, or law. Free to enter, open worldwide, and genuinely prestigious. Note there is a fee if you are shortlisted and attend the awards dinner, so read the terms before assuming it is free end to end.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Questions released in the spring, submissions close at the end of June.',
    activeMonths: [3, 4, 5, 6],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free to enter', 'Virtual', 'Writing', 'Selective'],
  },
  {
    title: 'Wikipedia editing',
    org: 'Wikimedia Foundation',
    slug: 'wikipedia-editing',
    apply_url: 'https://en.wikipedia.org/wiki/Wikipedia:Contributing_to_Wikipedia',
    description:
      'An honest one: no application, no age limit, no credential, and a permanent public edit history anyone can check. Sustained work on articles in a field you care about is a real, verifiable body of contribution. Most people quit in a week, which is exactly why doing it for a year is worth something.',
    kind: 'volunteer',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Always open. Start with one small edit.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'Public record', 'Start today'],
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// VIRTUAL NATIONAL PROGRAMS — the correction batch
//
// An earlier analysis in this file concluded the competitor directory was
// mostly other-metro local volunteering, based on searching entry TITLES for
// city names. That was a bad proxy: the location lives in a field, not the
// name, and the sample skewed to the alphabetical head of the list ("826
// Valencia", "A Place at the Table"), which is exactly where local org names
// cluster.
//
// The real distribution is heavily virtual and national — NASA citizen
// science, FAA design challenges, university online courses, student-run
// tutoring nonprofits — plus a genuine NJ cluster. Virtual carries no
// geography problem at all, which makes it the best answer to thin local
// supply: a 14-year-old with no working papers and no way to get anywhere can
// start most of these tonight.
// ─────────────────────────────────────────────────────────────────────────────

OPPORTUNITY_SOURCES.push(
  {
    title: 'NASA Citizen Science projects',
    org: 'NASA',
    slug: 'nasa-citizen-science',
    apply_url: 'https://science.nasa.gov/citizen-science/',
    description:
      'NASA runs dozens of open projects where volunteers do real analysis: inspecting telescope images for asteroids, reporting ice conditions, logging precipitation. No application, no age minimum, no cost, and contributions have led to named credits on published papers. Start in an evening and stop whenever.',
    kind: 'volunteer',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Always open across dozens of projects.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'No age limit', 'Real research'],
  },
  {
    title: 'FAA Airport Design Challenge',
    org: 'Federal Aviation Administration',
    slug: 'faa-airport-design-challenge',
    apply_url: 'https://www.faa.gov/education/airport_design_challenge',
    description:
      'Design a working airport in Minecraft while going through FAA engineering modules. Free, virtual, and open to K-12, which makes it one of the very few genuine engineering competitions available below 9th grade. Team or solo.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'Registration runs through the summer with an autumn build season.',
    activeMonths: [6, 7, 8, 9, 10, 11],
    evidence_kind: 'award',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'Open below grade 9', 'Engineering'],
  },
  {
    title: 'Flight Path Cybersecurity Competition',
    org: 'Air & Space Forces Association',
    slug: 'flight-path-cyber',
    apply_url: 'https://www.codermerlin.academy/narp/flight-path/',
    description:
      'A nationwide online round mixing Capture the Flag puzzles with coding challenges, built for high school teams. Virtual, so there is no travel, and cybersecurity CTFs are one of the few areas where a self-taught teenager can genuinely outperform a well-funded school program.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Online round runs in the late summer and autumn.',
    activeMonths: [7, 8, 9, 10, 11],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['Virtual', 'Team', 'Cybersecurity'],
  },
  {
    title: 'Great Sunflower Project',
    org: 'Great Sunflower Project',
    slug: 'great-sunflower-project',
    apply_url: 'https://www.greatsunflower.org/',
    description:
      'Count pollinators on plants near you and submit the observations to a national conservation dataset. Takes fifteen minutes at a time, needs nothing but a phone, and the data is genuinely used. A realistic way to log consistent hours over a summer.',
    kind: 'volunteer',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Observations run through the growing season, spring to autumn.',
    activeMonths: [4, 5, 6, 7, 8, 9, 10],
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'No age limit', 'Citizen science'],
  },
  {
    title: 'AwesomeMath Academy',
    org: 'AwesomeMath',
    slug: 'awesomemath-academy',
    apply_url: 'https://www.awesomemath.org/',
    description:
      'Twelve-week live online advanced-maths courses aimed at competition preparation, for middle and high school. Genuinely rigorous and taught live rather than self-paced. This one costs money, so check the current fee and any aid before committing.',
    kind: 'program',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 7,
    max_grade: 12,
    recurrence: 'rolling',
    windowNote: 'Courses run in terms through the year.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'certificate',
    rung_from: 1,
    rung_to: 2,
    tags: ['Paid', 'Virtual', 'Live teaching', 'Maths'],
  },
  {
    title: 'Johns Hopkins CTY online courses',
    org: 'Johns Hopkins Center for Talented Youth',
    slug: 'jhu-cty-online',
    apply_url: 'https://cty.jhu.edu/',
    description:
      'Live online courses in computer science, maths, writing and science, including Arduino and robotics tracks. Well taught and well regarded. Admission usually requires a qualifying test score, and tuition is significant, though CTY does offer financial aid worth asking about.',
    kind: 'program',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 7,
    max_grade: 12,
    recurrence: 'rolling',
    windowNote: 'Sessions run year-round with rolling enrolment.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'certificate',
    rung_from: 1,
    rung_to: 2,
    tags: ['Paid', 'Financial aid available', 'Virtual', 'Selective'],
  },
  {
    title: 'Project Learning Tree green career resources',
    org: 'Sustainable Forestry Initiative',
    slug: 'project-learning-tree',
    apply_url: 'https://www.plt.org/',
    description:
      'Career exploration for forestry, conservation and environmental work, including a quiz that maps interests to actual green jobs and their entry requirements. Not a credential, but genuinely useful if you have no idea what you want and want something concrete to react to.',
    kind: 'program',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Always available.',
    activeMonths: ALL_YEAR,
    evidence_kind: 'certificate',
    rung_from: 0,
    rung_to: 1,
    tags: ['Free', 'Virtual', 'Career exploration'],
  },
  {
    title: 'Teen Advisory Board',
    org: 'Jersey City Free Public Library',
    slug: 'jcfpl-teen-advisory-board',
    apply_url: 'https://www.jclibrary.org/teens',
    description:
      'Teens on the board help plan and run library events and programming for other teens. Different from general volunteering: you hold an actual position with responsibility, which is what turns into a title on an application and a librarian who can speak to your judgement rather than just your attendance.',
    kind: 'org_role',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 8,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Recruits through the school year, ask at any branch.',
    activeMonths: ALL_YEAR,
    supervised: true,
    evidence_kind: 'title',
    rung_from: 0,
    rung_to: 3,
    tags: ['Free', 'Jersey City', 'Open at 14', 'Real responsibility'],
  },
)

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
