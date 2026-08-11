/**
 * EMPLOYTEENS — curated opportunities: competitions, programs, volunteering
 *
 * EMPTY ON PURPOSE. The previous 42 entries were cleared on 2026-08-10 because
 * the founder is supplying a hand-picked list instead. The rules below survived
 * the reset because they are the spec every new entry has to meet, and most of
 * them exist because we watched a competitor break them.
 *
 * ── 1. NO INVENTED DEADLINES ─────────────────────────────────────────────
 *
 * Checked congressionalappchallenge.us on 2026-08-10: their student page still
 * advertised "The 2025 Congressional App Challenge launched on May 1st, 2025.
 * Students can enter through October 30th, 2025." In August 2026. The
 * organiser's own site was a year stale.
 *
 * So `windowNote` carries the recurring PATTERN in plain English ("opens around
 * May, closes late October"), which stays true. A hard date only goes in
 * `deadline`, and only with the date we read it and the page we read it from,
 * so the UI can age it out gracefully instead of asserting it forever.
 *
 * ── 2. ELIGIBILITY IS MANDATORY ──────────────────────────────────────────
 *
 * Every entry declares delivery, eligible_regions, and a grade range. The
 * database enforces it with a CHECK constraint. This is the guard against the
 * two failures we watched live on a competitor: a German-language competition
 * run out of Berlin, and an Australia-and-New-Zealand-only stock game, both
 * ranked highly for a Jersey City sophomore. Neither was a distance problem —
 * both were virtual. Neither had an eligibility field.
 *
 * VIRTUAL DOES NOT MEAN OPEN TO EVERYONE. That assumption is exactly what put
 * Berlin at the top of a Hudson County teen's roadmap.
 *
 * ── 3. COST IS STATED OR MARKED UNCONFIRMED ──────────────────────────────
 *
 *   cost_cents: null       genuinely free, confirmed
 *   cost_cents: 25000      $250, confirmed on the organiser's own page
 *   cost_cents omitted     we could not confirm → card reads "Cost unconfirmed"
 *
 * Never a guess. A family working out whether their kid can afford something
 * needs that number to be true, and "unconfirmed" is a truthful answer where a
 * wrong number is not.
 *
 * ── 4. EVIDENCE HONESTY ──────────────────────────────────────────────────
 *
 * `evidence_kind: 'reference'` requires `supervised: true`, and a test enforces
 * it. The distinction is not the delivery format, it is whether a named human
 * would take the call. Crisis Text Line is virtual, rolling, and produces a
 * real reference — application, 30 hours of training, a supervisor. MIT
 * OpenCourseWare is virtual, rolling, and produces nothing of the kind, because
 * nobody there knows you exist. Calling a self-paced course a reference is what
 * makes a ladder decorative.
 *
 * ── 5. LINKS ARE VERIFIED, NOT REMEMBERED ────────────────────────────────
 *
 * The first pass wrote two URLs from memory (a deep faa.gov path and an
 * nyc.gov slug). Both 404'd on the first recheck. Read the URL off the page.
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

  /** Null = confirmed free. Omitted = unconfirmed, card says so. */
  cost_cents?: number | null
  recurrence: 'annual' | 'seasonal' | 'rolling' | 'one_time'
  /** Plain-English yearly cycle. Shown instead of a date. */
  windowNote: string
  /** A real date, only when read off the organiser's page, with proof. */
  deadline?: { date: string; verifiedOn: string; source: string }
  /** Months the entry is live. Empty means all year. */
  activeMonths?: number[]

  /** What finishing this actually produces. Drives evidence-strength sorting. */
  evidence_kind: 'hours' | 'title' | 'award' | 'reference' | 'income' | 'certificate'
  /** Is there a named human who would take a reference call? Required for 'reference'. */
  supervised?: boolean
  rung_from: number
  rung_to: number
  tags: string[]
}

/** Use for entries with no seasonal window. */
export const ALL_YEAR: number[] = []

/**
 * Curated by the founder, categorised and written up 2026-08-10. Picked up by
 * /api/ingest/opportunities on the next run.
 */
export const OPPORTUNITY_SOURCES: OpportunitySource[] = [
  // ══ BUSINESS & FINANCE ══════════════════════════════════════════════════
  {
    title: 'Boston Global Investment Competition',
    org: 'Global Youth Investments',
    slug: 'bgic',
    apply_url: 'https://forms.gle/WLb6Da1qRi8Wy56x9',
    description:
      'Write a real investment research report and pitch it live to people who actually pick stocks for a living. Open to middle and high schoolers, students from 27+ countries compete, and registered participants get preparatory workshops before submitting. The research report is the whole thing \u2014 this is not a stock-picking game, it is learning to argue a thesis with evidence. Register and submit early; the organisers say judges need time and the deadline has already been extended once.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Registration and report due in late August, live presentations in early September.',
    deadline: { date: '2026-08-28', verifiedOn: '2026-08-10', source: 'https://globalyouthinvestments.com/' },
    activeMonths: [6, 7, 8],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['Virtual', 'Closes soon', 'Research report', 'Finance'],
  },
  {
    title: 'Virtual Business Challenge (FCCLA)',
    org: 'Knowledge Matters',
    slug: 'vbc-fccla',
    apply_url: 'https://www.knowledgematters.com/high-school/competitions/fccla/',
    description:
      'A business simulation competition run through FCCLA. You manage a virtual company and compete on the results, which makes it far more forgiving than a written case competition \u2014 you learn by replaying rather than by getting one shot. Step one is checking whether your school has an FCCLA chapter, because entry runs through it.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Rounds run through the autumn and winter school terms.',
    activeMonths: [9, 10, 11, 12, 1, 2],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 2,
    tags: ['Virtual', 'School chapter needed', 'Business', 'Cost unconfirmed'],
  },
  {
    title: 'Virtual Business Challenge (BPA)',
    org: 'Knowledge Matters',
    slug: 'vbc-bpa',
    apply_url: 'https://www.knowledgematters.com/high-school/competitions/bpa/',
    description:
      'The Business Professionals of America version of the same simulation. Same format, different chapter route. If your school has BPA rather than FCCLA, this is your entry point.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Rounds run through the autumn and winter school terms.',
    activeMonths: [9, 10, 11, 12, 1, 2],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 2,
    tags: ['Virtual', 'School chapter needed', 'Business', 'Cost unconfirmed'],
  },
  {
    title: 'Blue Ocean Student Entrepreneur Competition',
    org: 'Blue Ocean Student Entrepreneurs Corp',
    slug: 'blue-ocean',
    apply_url: 'https://blueoceancompetition.org/register/',
    description:
      'Submit a five-minute pitch video for a business idea. Free, fully virtual, and \u2014 unusually \u2014 no teacher sponsor or school chapter required, which makes it one of the very few real business competitions a teen can enter entirely on their own.',
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
    title: 'Rutgers Summer Experience',
    org: 'Rutgers School of Business, Camden',
    slug: 'rutgers-ruse-camden',
    apply_url: 'https://business.camden.rutgers.edu/ruse-application/',
    description:
      'A summer business programme on the Rutgers Camden campus. Real university teaching and a campus to walk around, which does more to demystify college than any brochure. Be realistic about the trip though: Camden is roughly ninety minutes each way from Hudson County, so this only works if you can stay nearby or a parent can drive.',
    kind: 'program',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Applications run in spring for a summer session.',
    activeMonths: [2, 3, 4, 5],
    evidence_kind: 'certificate',
    rung_from: 1,
    rung_to: 2,
    tags: ['South Jersey', 'Long trip', 'Campus based', 'Cost unconfirmed'],
  },
  {
    title: 'EconEd student membership',
    org: 'EconEd',
    slug: 'econ-ed-join',
    apply_url: 'https://econ-ed.org/join',
    description:
      'A student-run economics education organisation you can join and contribute to. Youth-led groups like this are often the easiest way to get an actual role and responsibility rather than just attendance, but check what the commitment involves before signing up.',
    kind: 'org_role',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    recurrence: 'rolling',
    windowNote: 'Rolling membership, join whenever.',
    activeMonths: [],
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Virtual', 'Youth-led', 'Economics', 'Cost unconfirmed'],
  },

  // ══ CS, ENGINEERING & SCIENCE ═══════════════════════════════════════════
  {
    title: 'Congressional App Challenge',
    org: 'U.S. House of Representatives',
    slug: 'congressional-app-challenge',
    apply_url: 'https://www.congressionalappchallenge.us/students/student-registration/',
    description:
      'Build an app and enter it in your own Congressional district. Judged per district rather than nationally, so the field is small and a first-time coder has a genuine shot. Winners get displayed in the Capitol. Free, any language or platform, solo or team. Robert Menendez is hosting in NJ-08, which covers Jersey City, Bayonne and Hoboken.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'Opens around May, entries close in late October.',
    deadline: { date: '2026-10-26', verifiedOn: '2026-08-10', source: 'https://www.congressionalappchallenge.us/students/participating-districts/' },
    activeMonths: [5, 6, 7, 8, 9, 10],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free', 'Virtual', 'Coding', 'Beginner friendly'],
  },
  {
    title: 'FAA Airport Design Challenge',
    org: 'Federal Aviation Administration',
    slug: 'faa-airport-design-challenge',
    apply_url: 'https://www.faa.gov/adc/adc_registration',
    description:
      'Design a working airport in Minecraft while going through FAA engineering modules. Free, virtual, and open all the way down to K-12, which makes it one of the only real engineering competitions available below ninth grade.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'Registration through the summer, projects due at the end of August.',
    activeMonths: [5, 6, 7, 8],
    evidence_kind: 'award',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'Open below grade 9', 'Engineering'],
  },
  {
    title: 'Coding and Creating With Arduino',
    org: 'Johns Hopkins Center for Talented Youth',
    slug: 'jhu-cty-arduino',
    apply_url: 'https://cty.jhu.edu/cty-experience/courses/coding-and-creating-arduinor-ardc',
    description:
      'A live online Arduino course for grades 7-11, taught by an instructor rather than self-paced. You need prior text-based coding experience, and CTY normally requires a qualifying test score to enrol. Tuition is significant \u2014 ask about financial aid before ruling it out, because CTY does offer it.',
    kind: 'program',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 7,
    max_grade: 11,
    recurrence: 'rolling',
    windowNote: 'Sessions run through the year with rolling enrolment.',
    activeMonths: [],
    evidence_kind: 'certificate',
    rung_from: 1,
    rung_to: 2,
    tags: ['Paid', 'Aid available', 'Virtual', 'Live teaching'],
  },
  {
    title: 'CEMC math and computing contests',
    org: 'University of Waterloo',
    slug: 'waterloo-cemc',
    apply_url: 'https://cemc.uwaterloo.ca/contests',
    description:
      'Waterloo runs a whole ladder of maths and computing contests, from the Beaver Computing Challenge for younger students up to the Euclid. Well designed and genuinely respected. Two things to know: you register through your school rather than individually, so ask a maths teacher, and there is usually a per-student fee.',
    kind: 'competition',
    delivery: 'in_person',
    eligible_regions: ['US', 'GLOBAL'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Contests run through the school year; registration closes weeks ahead of each one.',
    activeMonths: [9, 10, 11, 12, 1, 2, 3, 4],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['School registers you', 'Maths', 'Cost unconfirmed'],
  },
  {
    title: 'Razorback AgCademy: Agricultural Systems',
    org: 'University of Arkansas',
    slug: 'uark-agcademy',
    apply_url: 'https://training.uark.edu/portal/training?cmd=catalog&course=razorback-agcademy-fundamentals-agri-sys-tech',
    description:
      'An online course in agricultural systems and technology. Genuinely different from the usual CS-or-business menu, and useful if you are interested in food systems or environmental work. Worth checking whether enrolment is open to students outside Arkansas before you spend time on it.',
    kind: 'program',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    recurrence: 'rolling',
    windowNote: 'Self-paced through an online training portal.',
    activeMonths: [],
    evidence_kind: 'certificate',
    rung_from: 0,
    rung_to: 2,
    tags: ['Virtual', 'Agriculture', 'Cost unconfirmed', 'Eligibility unconfirmed'],
  },

  // ══ CITIZEN SCIENCE ═════════════════════════════════════════════════════
  {
    title: 'CoCoRaHS rain, hail and snow network',
    org: 'NASA Citizen Science',
    slug: 'cocorahs',
    apply_url: 'https://science.nasa.gov/citizen-science/community-collaborative-rain-hail-and-snow-network/',
    description:
      'Measure precipitation where you live and submit it to a national climate dataset used by the National Weather Service. Takes minutes a day, needs a cheap gauge, and there is no age minimum or application. One of the few things on this list you could genuinely start tomorrow.',
    kind: 'volunteer',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Always open, report whenever it rains.',
    activeMonths: [],
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'No age limit', 'Start today'],
  },
  {
    title: 'Fresh Eyes on Ice',
    org: 'NASA Citizen Science',
    slug: 'fresh-eyes-on-ice',
    apply_url: 'https://science.nasa.gov/citizen-science/fresh-eyes-on-ice/',
    description:
      'Report freshwater ice conditions to support safety and climate research. Most of the on-the-ground observing happens in Alaska, but the project also needs people analysing submitted imagery, which you can do from anywhere.',
    kind: 'volunteer',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Runs year-round, busiest through the winter freeze.',
    activeMonths: [],
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'No age limit', 'Climate research'],
  },
  {
    title: 'Chesapeake Water Watch',
    org: 'NASA Citizen Science',
    slug: 'chesapeake-water-watch',
    apply_url: 'https://science.nasa.gov/citizen-science/chesapeake-water-watch/',
    description:
      'Photograph water and take simple measurements so researchers can calibrate satellite readings of water quality. Focused on the Chesapeake, so check whether they accept observations from other watersheds before committing \u2014 the Hackensack Riverkeeper cleanups may be the better local fit.',
    kind: 'volunteer',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Year-round, most useful in the growing season.',
    activeMonths: [],
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'No age limit', 'Water quality'],
  },
  {
    title: 'Great Sunflower Project',
    org: 'Great Sunflower Project',
    slug: 'great-sunflower-project',
    apply_url: 'https://www.greatsunflower.org/quickguide',
    description:
      'Sit by a flowering plant for fifteen minutes and count the pollinators that visit, then submit it. That is the entire method. The data feeds real conservation work, it needs nothing but a phone, and it is one of the easiest ways to build up consistent logged hours over a summer.',
    kind: 'volunteer',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'seasonal',
    windowNote: 'Observations run through the growing season, spring to autumn.',
    activeMonths: [4, 5, 6, 7, 8, 9, 10],
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'No age limit', 'Start today'],
  },

  // ══ NEW JERSEY \u2014 LOCAL ════════════════════════════════════════════════
  {
    title: 'Teen volunteer programs',
    org: 'North Bergen Free Public Library',
    slug: 'nbpl-teen-volunteer',
    apply_url: 'https://nbpl.org/teen-volunteer/',
    description:
      'Three ways in: Homework Help volunteering with younger kids, the Teen Advisory Board which plans and runs library programming, and Score Up summer volunteering. Open from seventh grade, free, and \u2014 the part that matters \u2014 the library issues a letter verifying your hours, which is a reference in writing. You must live in North Bergen or Guttenberg. Fill in a volunteer form at the youth services desk and wait for a librarian to call. Note the main library is closed for renovation; the temporary location is 510 81st Street.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 7,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Rolling intake, with a bigger push before the summer programme.',
    activeMonths: [],
    supervised: true,
    evidence_kind: 'reference',
    rung_from: 0,
    rung_to: 3,
    tags: ['Free', 'Hudson County', 'Open at 12', 'Written reference', 'Residents only'],
  },
  {
    title: 'River cleanups',
    org: 'Hackensack Riverkeeper',
    slug: 'hackensack-riverkeeper-cleanups',
    apply_url: 'https://www.hackensackriverkeeper.org/cleanups',
    description:
      'Show up to a scheduled cleanup on the Hackensack River and put in a morning. No application, no interview, no minimum commitment, and it is the most straightforward local volunteering on this list. Go repeatedly and the organisers will know your name, which is how a morning turns into a reference.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'seasonal',
    windowNote: 'Cleanups run mostly in the warmer months, spring through autumn.',
    activeMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Local', 'No application', 'Open under 16'],
  },
  {
    title: 'High School Educational Monitoring Program',
    org: 'Meadowlands Research & Restoration Institute',
    slug: 'meadowlands-monitoring',
    apply_url: 'https://meadowlandsrri.com/high-school-educational-monitoring-program/',
    description:
      'Classes test their local waterway all year using a monitoring kit, measuring dissolved oxygen, nitrates, pH and more, and the data goes to the Institute for review and public release. Real science that gets used. Important: this runs through schools, not individuals \u2014 Bayonne PS #14 and Lyndhurst High are already in the network. So the move is asking a science teacher to join, not applying yourself.',
    kind: 'program',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Runs across the school year; schools join by contacting the project manager.',
    activeMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5],
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Local', 'Ask a teacher', 'Real research'],
  },
  {
    title: 'Community group volunteering',
    org: 'Greater Newark Conservancy',
    slug: 'greater-newark-volunteer',
    apply_url: 'https://greaternewark.org/volunteer-form-community-group/',
    description:
      'Urban farming, garden builds and neighbourhood greening in Newark. The form on this page is set up for community groups, so if you are going on your own it is worth emailing first to ask how an individual teen joins.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NJ'],
    language: 'en',
    min_grade: 8,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'seasonal',
    windowNote: 'Mostly growing-season work, spring through autumn.',
    activeMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Newark', 'Group form', 'Open under 16'],
  },

  // ══ NEW YORK \u2014 LOCAL ══════════════════════════════════════════════════
  {
    title: 'Academic Year Teen Internship',
    org: 'DOROT',
    slug: 'dorot-teen-internship',
    apply_url: 'https://www.dorotusa.org/volunteer/academic-year-teen-internship/',
    description:
      'A structured internship pairing teens with older adults across the school year. Properly supervised with real training, which is rare for something open to high schoolers, and it means you finish with a named staff member who has watched you work for months rather than a certificate.',
    kind: 'internship',
    delivery: 'in_person',
    eligible_regions: ['US-NY'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'Applications in late summer for a programme running across the school year.',
    activeMonths: [7, 8, 9],
    supervised: true,
    evidence_kind: 'reference',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free', 'NYC', 'Supervised', 'Builds a reference'],
  },
  {
    title: '53rd Street Outpatient Volunteers',
    org: 'Memorial Sloan Kettering',
    slug: 'msk-53rd-street-volunteers',
    apply_url: 'https://msk.wd108.myworkdayjobs.com/MSKCC_Careers_Primary/job/New-York-NY/XMLNAME-53rd-Street-Outpatient-Volunteers_92807',
    description:
      'Volunteering in an outpatient cancer centre, which is about as real as clinical exposure gets before college. Expect an application, screening and a term commitment. Hospital volunteering usually carries a minimum age of 16 or 18 \u2014 check the posting before you plan around it.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NY'],
    language: 'en',
    min_grade: 11,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Posted as an ongoing role; intake happens in cohorts.',
    activeMonths: [],
    supervised: true,
    evidence_kind: 'reference',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free', 'NYC', 'Likely 16+', 'Healthcare'],
  },
  {
    title: 'Volunteer with Brooklyn Book Bodega',
    org: 'Brooklyn Book Bodega',
    slug: 'brooklyn-book-bodega',
    apply_url: 'https://www.brooklynbookbodega.org/volunteer',
    description:
      'Sorting and distributing books to get them into kids\u2019 homes across Brooklyn. Concrete, physical, and easy to explain later. Shift-based, so you can start with one Saturday and see how it goes.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NY'],
    language: 'en',
    min_grade: 8,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Shifts posted through the year.',
    activeMonths: [],
    evidence_kind: 'hours',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Brooklyn', 'Shift based', 'Open under 16'],
  },
  {
    title: 'Teen volunteering',
    org: 'Brooklyn Public Library',
    slug: 'brooklyn-public-library-volunteer',
    apply_url: 'https://www.bklynlibrary.org/volunteer',
    description:
      'The Brooklyn system runs teen volunteering across dozens of branches, so there is almost certainly one near wherever you are. Library volunteering is consistently one of the best first placements: welcoming to younger teens, genuinely useful, and staff are used to writing verification letters.',
    kind: 'volunteer',
    delivery: 'in_person',
    eligible_regions: ['US-NY'],
    language: 'en',
    min_grade: 7,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Rolling, with the biggest intake before summer reading.',
    activeMonths: [],
    supervised: true,
    evidence_kind: 'reference',
    rung_from: 0,
    rung_to: 3,
    tags: ['Free', 'Brooklyn', 'Open at 12', 'Builds a reference'],
  },
  {
    title: 'Prep Center programs',
    org: 'Brooklyn College',
    slug: 'brooklyn-college-prep-center',
    apply_url: 'https://www.brooklyn.edu/prepcenter/',
    description:
      'College preparation programmes run on the Brooklyn College campus. Being on a real campus and taught by university staff does more for a first-generation student than any amount of advice. Check cost and eligibility on the page \u2014 some prep programmes are grant-funded and free, others are not.',
    kind: 'program',
    delivery: 'in_person',
    eligible_regions: ['US-NY'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    recurrence: 'rolling',
    windowNote: 'Programmes run across the school year and summer.',
    activeMonths: [],
    evidence_kind: 'certificate',
    rung_from: 0,
    rung_to: 2,
    tags: ['Brooklyn', 'Campus based', 'Cost unconfirmed'],
  },
  {
    title: 'Theatre classes and youth programs',
    org: 'Brooklyn Children\u2019s Theatre',
    slug: 'brooklyn-childrens-theatre',
    apply_url: 'https://www.brooklynchildrenstheatre.org/classes/',
    description:
      'Performance classes and a teen ensemble in Brooklyn. Be clear-eyed that this is a paid class rather than a role you are selected for, so it builds skill rather than a track record. Worth it if performing is the thing you actually care about; check tuition and any scholarship options first.',
    kind: 'program',
    delivery: 'in_person',
    eligible_regions: ['US-NY'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    recurrence: 'rolling',
    windowNote: 'Terms run through the school year with a summer session.',
    activeMonths: [],
    evidence_kind: 'certificate',
    rung_from: 0,
    rung_to: 1,
    tags: ['Brooklyn', 'Paid classes', 'Cost unconfirmed', 'Arts'],
  },
  {
    title: 'Columbia Model UN Conference (CMUNCE)',
    org: 'Columbia University',
    slug: 'cmunce',
    apply_url: 'https://cmunce.org/register-here',
    description:
      'A Model UN conference run by Columbia students, held on campus in Manhattan. Strong crisis committees and a genuinely competitive field. Two things to sort first: delegates normally register through a school delegation rather than individually, and conferences like this carry a delegate fee.',
    kind: 'competition',
    delivery: 'in_person',
    eligible_regions: ['US-NY', 'US-NJ'],
    language: 'en',
    min_grade: 9,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Registration in the autumn for a conference in the new year.',
    activeMonths: [9, 10, 11, 12],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['NYC', 'School delegation', 'Cost unconfirmed', 'Model UN'],
  },

  // ══ MEDIA, ARTS & CIVICS ════════════════════════════════════════════════
  {
    title: 'C-SPAN StudentCam',
    org: 'C-SPAN Education Foundation',
    slug: 'cspan-studentcam',
    apply_url: 'https://www.studentcam.org/',
    description:
      'Make a five to six minute documentary about a public policy issue that matters to you, using some C-SPAN footage. Free, open from sixth grade, solo or in a team of three, and $100,000 in prizes spread across 150 winners \u2014 which means the odds are far better than most national competitions. Strong entries show the other side of the argument, not just yours.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['US', 'GLOBAL'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'Opens in the autumn, entries close in January.',
    activeMonths: [9, 10, 11, 12, 1],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free', 'Virtual', 'Open below grade 9', 'Film'],
  },
  {
    title: 'K12 Photography Competition',
    org: 'K12 Enrichment',
    slug: 'k12-photo-competition',
    apply_url: 'https://enrichment.k12.com/photo-competition-registration/',
    description:
      'A free nationwide photography competition where you submit original photographs and the story behind them. No equipment requirement beyond a camera or a phone, which makes it one of the more accessible arts competitions on this list.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'annual',
    windowNote: 'Entries open in the summer and close in late August.',
    activeMonths: [6, 7, 8],
    evidence_kind: 'award',
    rung_from: 0,
    rung_to: 2,
    tags: ['Free', 'Virtual', 'Phone is fine', 'Arts'],
  },
  {
    title: 'Decoding the Document',
    org: 'National Constitution Center',
    slug: 'ncc-decoding-the-document',
    apply_url: 'https://constitutioncenter.org/education/live-online-events/decoding-the-document',
    description:
      'Live online sessions where constitutional scholars work through a founding document with students. Free, no application, and you can drop into one to see whether it is your thing. Not a credential, but genuinely good if law or politics interests you and you want something more substantial than a video.',
    kind: 'program',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Sessions scheduled through the school year.',
    activeMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5],
    evidence_kind: 'certificate',
    rung_from: 0,
    rung_to: 1,
    tags: ['Free', 'Virtual', 'Drop in', 'Civics'],
  },
  {
    title: 'International Youth Film Festival submission',
    org: 'International Youth Film Festival',
    slug: 'iyff-submit',
    apply_url: 'https://internationalyouthfilmfestival.org/submit-2026',
    description:
      'Submit a film to a festival judged against other young filmmakers worldwide. A selection or a screening is a real, citable result. Festivals normally charge a submission fee, so check that and the category rules before you finish your edit.',
    kind: 'competition',
    delivery: 'virtual',
    eligible_regions: ['GLOBAL'],
    language: 'en',
    min_grade: 6,
    max_grade: 12,
    recurrence: 'annual',
    windowNote: 'Submissions open ahead of the festival season each year.',
    activeMonths: [],
    evidence_kind: 'award',
    rung_from: 1,
    rung_to: 3,
    tags: ['Virtual', 'Film', 'Cost unconfirmed'],
  },

  // ══ TUTORING ════════════════════════════════════════════════════════════
  {
    title: 'Volunteer tutor',
    org: 'Connect Me',
    slug: 'connect-me-tutor',
    apply_url: 'https://connectmego.org/tutor-application/',
    description:
      'One-to-one online tutoring for students who need it, run by high school and college volunteers. You tutor a subject you are already good at, on your own schedule, from home. Programmes like this normally set a minimum age around 16 and ask you to pass a subject check, so read the application before counting on it.',
    kind: 'volunteer',
    delivery: 'virtual',
    eligible_regions: ['US'],
    language: 'en',
    min_grade: 10,
    max_grade: 12,
    cost_cents: null,
    recurrence: 'rolling',
    windowNote: 'Rolling applications through the year.',
    activeMonths: [],
    supervised: true,
    evidence_kind: 'reference',
    rung_from: 1,
    rung_to: 3,
    tags: ['Free', 'Virtual', 'Tutoring', 'Likely 16+'],
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
