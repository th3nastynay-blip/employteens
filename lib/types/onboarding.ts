// ── Core onboarding state ───────────────────────────────────────────
export interface OnboardingState {
  step: number
  name: string
  age: number | null
  state: 'NY' | 'NJ' | ''
  zip_code: string
  // Multi-select: first item is primary, rest are secondary
  transportation: Transportation[]
  school_grade: SchoolGrade | ''
  school_end_time: string
  availability: WeeklyAvailability
  // Weighted interests: { "Retail & Shopping": 3, "Technology": 1 }
  // 3 = High, 2 = Medium, 1 = Low (order of selection = weight by default)
  interests: WeightedInterest[]
  skills: string[]
  languages: string[]
  experience: ExperienceLevel | ''
  resume_file: File | null
  resume_url: string | null
}

// ── Weighted interest ────────────────────────────────────────────────
export interface WeightedInterest {
  name: string
  // 3 = High, 2 = Medium, 1 = Low
  weight: 1 | 2 | 3
}

// ── Transportation ───────────────────────────────────────────────────
export type Transportation =
  | 'walking'
  | 'public_transit'
  | 'bike'
  | 'car'
  | 'parent_dropoff'
  | 'rideshare'

// ── School ──────────────────────────────────────────────────────────
export type SchoolGrade = '8th' | '9th' | '10th' | '11th' | '12th' | 'graduated'

// ── Experience ──────────────────────────────────────────────────────
export type ExperienceLevel = 'none' | 'some_volunteering' | 'one_job' | 'multiple_jobs'

// ── Availability ────────────────────────────────────────────────────
export type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export interface WeeklyAvailability {
  [key: string]: boolean
  monday: boolean
  tuesday: boolean
  wednesday: boolean
  thursday: boolean
  friday: boolean
  saturday: boolean
  sunday: boolean
}

// ── Options ──────────────────────────────────────────────────────────
export const INTEREST_OPTIONS = [
  'Food & Restaurants',
  'Retail & Shopping',
  'Sports & Fitness',
  'Entertainment & Movies',
  'Technology',
  'Healthcare & Childcare',
  'Arts & Music',
  'Outdoors & Nature',
  'Tutoring & Education',
  'Customer Service',
  'Delivery & Logistics',
  'Office & Admin',
] as const

export const SKILL_OPTIONS = [
  'Communication',
  'Teamwork',
  'Cash Handling',
  'Social Media',
  'Microsoft Office',
  'Customer Service',
  'Food Handling',
  'Physical Labor',
  'Driving',
  'Computer Skills',
  'Creative Skills',
  'Math / Numbers',
] as const

export const LANGUAGE_OPTIONS = [
  'Spanish',
  'Mandarin',
  'Cantonese',
  'French',
  'Arabic',
  'Hindi',
  'Portuguese',
  'Russian',
  'Korean',
  'Bengali',
] as const

export const TRANSPORTATION_OPTIONS: {
  value: Transportation
  label: string
  emoji: string
  desc: string
  rangeLabel: string
}[] = [
  { value: 'walking',      label: 'Walking',           emoji: '🚶', desc: 'On foot',              rangeLabel: 'Within 1 mile' },
  { value: 'public_transit', label: 'Bus / Train',     emoji: '🚌', desc: 'Subway, bus, light rail', rangeLabel: 'Up to 10 miles' },
  { value: 'bike',         label: 'Bike',              emoji: '🚲', desc: 'Bicycle or e-bike',    rangeLabel: 'Within 3 miles' },
  { value: 'car',          label: 'I drive',           emoji: '🚗', desc: 'Own car or license',   rangeLabel: 'Flexible range' },
  { value: 'parent_dropoff', label: 'Parent / Guardian', emoji: '👨‍👧', desc: 'Drop-off & pick-up', rangeLabel: 'Flexible range' },
  { value: 'rideshare',    label: 'Uber / Lyft',       emoji: '📱', desc: 'Ride-sharing apps',    rangeLabel: 'Up to 5 miles' },
]

export const GRADE_LABELS: Record<SchoolGrade, string> = {
  '8th': '8th Grade',
  '9th': '9th Grade',
  '10th': '10th Grade',
  '11th': '11th Grade',
  '12th': '12th Grade',
  graduated: 'Graduated / GED',
}

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  none: 'No experience yet',
  some_volunteering: 'Some volunteer work',
  one_job: 'Had one job before',
  multiple_jobs: 'Multiple jobs',
}

// ── Serialization helpers ────────────────────────────────────────────
// Transportation is stored in DB as a JSON string (TEXT column, no migration needed)
// e.g. '["walking","public_transit"]' or legacy '"walking"'
export function serializeTransportation(t: Transportation[]): string {
  return JSON.stringify(t)
}

export function deserializeTransportation(raw: string | null | undefined): Transportation[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as Transportation[]
    if (typeof parsed === 'string') return [parsed as Transportation]
    return []
  } catch {
    // Legacy plain string
    if (typeof raw === 'string' && raw.length > 0) return [raw as Transportation]
    return []
  }
}

// Interests stored as JSON string: '[{"name":"Retail","weight":3}]'
// or legacy '["Retail"]'
export function serializeInterests(interests: WeightedInterest[]): string {
  return JSON.stringify(interests)
}

export function deserializeInterests(raw: unknown): WeightedInterest[] {
  if (!raw) return []
  try {
    // Already an array of objects
    if (Array.isArray(raw)) {
      if (raw.length === 0) return []
      // WeightedInterest format
      if (typeof raw[0] === 'object' && 'name' in raw[0]) return raw as WeightedInterest[]
      // Legacy string array
      if (typeof raw[0] === 'string') {
        return (raw as string[]).map((name, i) => ({
          name,
          weight: Math.max(1, 3 - i) as 1 | 2 | 3,
        }))
      }
    }
    // JSON string
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw)
      return deserializeInterests(parsed)
    }
    return []
  } catch {
    return []
  }
}
