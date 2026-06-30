export interface OnboardingState {
  step: number
  name: string
  age: number | null
  state: 'NY' | 'NJ' | ''
  zip_code: string
  transportation: Transportation | ''
  school_grade: SchoolGrade | ''
  school_end_time: string
  availability: WeeklyAvailability
  interests: string[]
  skills: string[]
  experience: ExperienceLevel | ''
  resume_file: File | null
  resume_url: string | null
}

export type Transportation = 'walking' | 'public_transit' | 'bike' | 'car' | 'parent_dropoff'

export type SchoolGrade = '8th' | '9th' | '10th' | '11th' | '12th' | 'graduated'

export type ExperienceLevel = 'none' | 'some_volunteering' | 'one_job' | 'multiple_jobs'

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

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
  'Languages (Spanish, etc.)',
  'Computer Skills',
  'Creative Skills',
] as const

export const TRANSPORTATION_LABELS: Record<Transportation, string> = {
  walking: 'Walking',
  public_transit: 'Bus / Train',
  bike: 'Bike',
  car: 'I have a car',
  parent_dropoff: 'Parent drop-off',
}

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
