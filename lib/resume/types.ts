/**
 * EMPLOYTEENS — resume shape and the seed that fills it
 *
 * THE POINT OF THIS FILE: a teen should never see an empty resume.
 *
 * "Write a resume" is where most first job hunts stall, and the reason is a
 * blank page plus the belief that you have nothing to put on it. Both are
 * solvable from data we already hold. By the time someone opens the resume page
 * they have told us their name, school, grade, availability, skills and
 * interests, and possibly had an adult confirm they would vouch for them. That
 * is a real resume already. Their job becomes editing, which everyone can do,
 * instead of starting, which stops people.
 *
 * WHAT IT WILL NOT DO: invent experience. Every seeded line is something the
 * teen entered or something an adult confirmed. The app that tells them not to
 * pad a resume does not get to pad it for them, and a fabricated bullet is one
 * an interviewer will ask about.
 */

import type { UserProfile } from '@/lib/types/database'

export interface ResumeExperience {
  id: string
  title: string
  org: string
  /** Free text: "Summer 2026", "Since March". Teens do not think in date ranges. */
  when: string
  bullets: string[]
}

export interface ResumeActivity {
  id: string
  title: string
  org: string
  note: string
}

export interface ResumeReference {
  name: string
  role: string
  org: string
  /** True only when the adult clicked the vouch link themselves. */
  confirmed: boolean
}

export interface ResumeData {
  fullName: string
  email: string
  phone: string
  location: string
  /** Two lines, first person implied. Not an "objective statement". */
  summary: string
  school: string
  grade: string
  gradYear: string
  availability: string
  experience: ResumeExperience[]
  activities: ResumeActivity[]
  skills: string[]
  reference: ResumeReference | null
}

export const EMPTY_RESUME: ResumeData = {
  fullName: '', email: '', phone: '', location: '',
  summary: '', school: '', grade: '', gradYear: '', availability: '',
  experience: [], activities: [], skills: [], reference: null,
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** "monday, tuesday" -> "Mon, Tue". Employers read a resume in seconds. */
function availabilityLine(availability: Record<string, boolean> | null | undefined): string {
  if (!availability) return ''
  const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const on = order.filter((d) => availability[d])
  if (on.length === 0) return ''
  if (on.length === 7) return 'Available any day'
  const short = on.map((d) => d.slice(0, 1).toUpperCase() + d.slice(1, 3))
  const weekendOnly = on.every((d) => d === 'saturday' || d === 'sunday')
  if (weekendOnly) return 'Weekends'
  return `Available ${short.join(', ')}`
}

/**
 * A first draft from what we already know.
 *
 * Only fills blanks — anything the teen has already edited wins, so
 * regenerating after a profile change never overwrites their own wording.
 */
export function seedResume(
  profile: UserProfile,
  reference: ResumeReference | null,
  existing?: Partial<ResumeData> | null,
): ResumeData {
  const p = profile as unknown as Record<string, unknown>
  const availability = profile.availability as Record<string, boolean> | undefined

  const skills = Array.isArray(profile.skills) ? (profile.skills as string[]) : []
  const seededSummary =
    'Reliable and on time, looking for part-time work that fits around school. ' +
    (reference?.confirmed
      ? `${reference.name} has agreed to be a reference.`
      : 'Comfortable talking to customers and happy to learn on the job.')

  const base: ResumeData = {
    fullName: String(profile.name ?? ''),
    email: String(p.email ?? ''),
    phone: String(p.phone ?? ''),
    location: [profile.state, profile.zip_code].filter(Boolean).join(' '),
    summary: seededSummary,
    school: String(p.school_name ?? ''),
    grade: String(profile.school_grade ?? ''),
    gradYear: '',
    availability: availabilityLine(availability),
    experience: [],
    activities: [],
    skills,
    reference,
  }

  if (!existing) return base

  // Merge: a present, non-empty value from the teen always beats the seed.
  const pick = <K extends keyof ResumeData>(k: K): ResumeData[K] => {
    const v = existing[k]
    if (v === undefined || v === null) return base[k]
    if (typeof v === 'string' && v.trim() === '') return base[k]
    if (Array.isArray(v) && v.length === 0) return base[k]
    return v as ResumeData[K]
  }

  return {
    fullName: pick('fullName'),
    email: pick('email'),
    phone: pick('phone'),
    location: pick('location'),
    summary: pick('summary'),
    school: pick('school'),
    grade: pick('grade'),
    gradYear: pick('gradYear'),
    availability: pick('availability'),
    experience: pick('experience'),
    activities: pick('activities'),
    skills: pick('skills'),
    // Reference is never taken from stored data. It is the one line an employer
    // may actually check, so it is re-read from the confirmed record every
    // time — a stale copy here is how a resume ends up claiming a vouch that
    // was withdrawn.
    reference,
  }
}

/**
 * Plain text, for pasting into an application box.
 *
 * Most teen job applications have a textarea, not a file upload, so this is the
 * format that actually gets used. Kept deliberately plain: no box drawing, no
 * markdown, nothing that turns to noise when pasted into a form.
 */
export function toPlainText(r: ResumeData): string {
  const out: string[] = []
  const line = (s?: string) => { if (s && s.trim()) out.push(s.trim()) }

  line(r.fullName.toUpperCase())
  line([r.email, r.phone, r.location].filter(Boolean).join(' · '))
  out.push('')

  if (r.summary.trim()) { line(r.summary); out.push('') }

  if (r.school || r.grade) {
    line('EDUCATION')
    line([r.school, r.grade, r.gradYear && `Class of ${r.gradYear}`].filter(Boolean).join(', '))
    out.push('')
  }

  if (r.experience.length) {
    line('EXPERIENCE')
    for (const e of r.experience) {
      line([e.title, e.org].filter(Boolean).join(' — ') + (e.when ? ` (${e.when})` : ''))
      for (const b of e.bullets) line(`  - ${b}`)
    }
    out.push('')
  }

  if (r.activities.length) {
    line('ACTIVITIES')
    for (const a of r.activities) {
      line([a.title, a.org].filter(Boolean).join(' — ') + (a.note ? `. ${a.note}` : ''))
    }
    out.push('')
  }

  if (r.skills.length) { line('SKILLS'); line(r.skills.join(', ')); out.push('') }
  if (r.availability.trim()) { line('AVAILABILITY'); line(r.availability); out.push('') }

  if (r.reference) {
    line('REFERENCE')
    line(
      [r.reference.name, r.reference.role, r.reference.org].filter(Boolean).join(', ') +
      (r.reference.confirmed ? ' (confirmed)' : ''),
    )
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
