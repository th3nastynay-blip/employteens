/**
 * EMPLOYTEENS — Title cleaner
 *
 * Scraped titles are stuffed with everything the employer's ATS let them
 * type: locations, store numbers, shift info, age notes, marketing
 * ("NEW CAFE OPENING!"). Product-quality titles are just the role:
 * "Barista", "Crew Member", "Camp Counselor". Everything informative that
 * we strip is preserved as structured tags; everything decorative is
 * dropped.
 *
 * Output:
 *   title        clean role title, Title Case
 *   tags         user-facing structured metadata ("Seasonal", "Weekend shifts", …)
 *   confidence   0–100 — how sure we are the cleaned title is a real role
 *                name (canonical match = high; leftover junk = low).
 *                Feeds the Job Quality Score.
 */

export interface CleanedTitle {
  title: string
  tags: string[]
  confidence: number
}

// Canonical teen-job role names. If the scraped title contains one of these,
// it IS the title — longest match wins ("assistant store manager" before
// "store manager" would matter if both were listed; order by length desc).
const CANONICAL_ROLES: string[] = [
  'assistant camp director',
  'recreation attendant',
  'front desk associate',
  'restaurant team member',
  'sales floor associate',
  'guest services associate',
  'customer service associate',
  'customer service representative',
  'shift supervisor',
  'sandwich artist',
  'theatre crew', 'theater crew',
  'camp counselor', 'day camp counselor',
  'swim instructor',
  'stock associate', 'stocking associate',
  'sales associate', 'retail associate', 'store associate',
  'team member', 'crew member', 'team associate',
  'shift leader',
  'kitchen staff', 'kitchen team member', 'kitchen crew',
  'front of house', 'back of house',
  'grocery bagger', 'courtesy clerk',
  'ice cream scooper', 'scooper',
  'concessions attendant', 'concession worker', 'concessions',
  'pool attendant',
  'package handler',
  'crew person',
  'food runner',
  'busser', 'busperson',
  'dishwasher',
  'lifeguard',
  'barista',
  'cashier',
  'usher',
  'server',
  'host', 'hostess',
  'tutor',
  'cook', 'line cook', 'prep cook', 'grill cook',
  'dietary aide',
  'library page',
  'counselor',
  'receptionist',
  'brand ambassador',
  'delivery driver',
  'car wash attendant',
  'bagger',
  'greeter',
  'porter',
  'cart attendant',
  'juicer', 'juicerista',
  'team trainer',
]

// Sorted longest-first so multi-word roles match before their substrings
const ROLES_BY_LENGTH = [...CANONICAL_ROLES].sort((a, b) => b.length - a.length)

// Patterns in the RAW title that become structured tags (user-facing labels)
const TAG_PATTERNS: { pattern: RegExp; tag: string }[] = [
  { pattern: /\b14\s*[-–—to&+]+\s*1[5-7]\b|\bage[s]?\s*14\b|\b14\s*(and|&|\+)\s*(up|older)\b/i, tag: 'Ages 14+' },
  { pattern: /\bage[s]?\s*15\b|\b15\s*(and|&|\+)\s*(up|older)\b|\b15\s*[-–—to&+]+\s*1[6-9]\b/i, tag: 'Ages 15+' },
  { pattern: /work permit|working papers/i, tag: 'Work permit needed' },
  { pattern: /\bseasonal\b|\bsummer\b/i, tag: 'Seasonal' },
  { pattern: /\bpart[\s-]?time\b|\bPT\b/i, tag: 'Part-time' },
  { pattern: /\bfull[\s-]?time\b/i, tag: 'Full-time' },
  { pattern: /weekend/i, tag: 'Weekend shifts' },
  { pattern: /after[\s-]?school|evening/i, tag: 'After school' },
  { pattern: /overnight|late night/i, tag: 'Late shifts' },
  { pattern: /now hiring|hiring (now|immediately)|immediate|urgent/i, tag: 'Hiring now' },
  { pattern: /no experience|entry[\s-]?level/i, tag: 'No experience needed' },
  { pattern: /paid training/i, tag: 'Paid training' },
  { pattern: /new (cafe|store|location|restaurant|opening)|grand opening|opening (soon|team)/i, tag: 'New location' },
  { pattern: /\bremote\b|work from home/i, tag: 'Remote' },
  { pattern: /\bhigh school\b|\bstudent[s]?\b|\bteen[s]?\b/i, tag: 'Student friendly' },
  { pattern: /flexible (schedule|hours)/i, tag: 'Flexible schedule' },
  { pattern: /\btip[s]?\b/i, tag: 'Tips' },
  { pattern: /volunteer/i, tag: 'Volunteer' },
]

// Decorative junk that never carries meaning worth keeping
const JUNK_PATTERNS: RegExp[] = [
  /[#*]+\s*\d{2,6}/g,                      // store numbers: #1234
  /\$\s?\d+(\.\d+)?\s*(\/|per\s*)?(hr|hour)?/gi, // inline pay
  /\b(asap|apply (now|today))\b/gi,
  /!{1,}/g,
  /\((?:[^)]*)\)/g,                        // any parenthetical
  /\[(?:[^\]]*)\]/g,                       // any bracketed
]

function titleCase(s: string): string {
  const minor = new Set(['of', 'and', 'the', 'for', 'to', 'in', 'at', 'a', 'an'])
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && minor.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

export function cleanJobTitle(rawTitle: string): CleanedTitle {
  const raw = (rawTitle ?? '').trim()
  const tags: string[] = []

  // 1. Collect structured tags from the raw title
  for (const { pattern, tag } of TAG_PATTERNS) {
    if (pattern.test(raw) && !tags.includes(tag)) tags.push(tag)
  }

  const lowerRaw = raw.toLowerCase()

  // 2. Canonical role match — the strongest signal we have
  const canonical = ROLES_BY_LENGTH.find((role) => lowerRaw.includes(role))
  if (canonical) {
    return { title: titleCase(canonical), tags, confidence: 95 }
  }

  // 3. No canonical match — clean the raw title mechanically.
  // Take the first segment before common separators (scraped titles put the
  // role first and pile qualifiers after: "Barista - Garden State Plaza - NEW").
  let working = raw.split(/\s+[-–—|•·:@]\s+|\s{2,}/)[0] ?? raw

  for (const junk of JUNK_PATTERNS) working = working.replace(junk, ' ')

  // Strip leftover shouting and normalize whitespace
  working = working.replace(/\s+/g, ' ').trim()

  // Titles ending in a comma-location: "Cashier, Jersey City" → "Cashier"
  working = working.replace(/,\s*[A-Z][a-zA-Z\s]+$/, '').trim()

  if (working.length === 0) {
    return { title: raw.slice(0, 60), tags, confidence: 10 }
  }

  // Confidence heuristics for non-canonical titles
  let confidence = 70
  const wordCount = working.split(/\s+/).length
  if (wordCount > 5) confidence -= 20            // still stuffed
  if (/\d/.test(working)) confidence -= 15       // digits = ids/pay/age leftovers
  if (working === working.toUpperCase() && working.length > 4) confidence -= 10 // SHOUTING
  if (wordCount <= 3) confidence += 10           // short = likely a real role

  return {
    title: titleCase(working).slice(0, 60),
    tags,
    confidence: Math.max(10, Math.min(90, confidence)),
  }
}
