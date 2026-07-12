/**
 * EMPLOYTEENS — Get Ready mode content (ages 14–15)
 *
 * THE HONEST PITCH: in NJ, working at 14 is legal with working papers, but
 * most employers set their own floor at 16. Meanwhile, "casual" work —
 * babysitting, pet care, lawn care, tutoring, caddying — is EXEMPT from
 * working-papers requirements entirely (NJ DOL: domestic/casual employment).
 * A 14-year-old can start earning this week with zero paperwork.
 *
 * We do NOT create listings for these (nothing to verify = trust risk).
 * Each gig card deep-links into the AI Coach with a tailored prompt — the
 * coach delivers a personalized how-to-start guide instead.
 */

import { LOCAL_SOURCES } from '@/lib/jobs/local-sources'

export interface GigGuide {
  emoji: string
  title: string
  blurb: string
  pay: string
  /** Sent to the AI Coach when the card is tapped */
  coachPrompt: string
}

export const GIG_GUIDES: GigGuide[] = [
  {
    emoji: '👶',
    title: 'Babysitting',
    blurb: 'The classic first job. No working papers needed — parents in Hudson County pay well.',
    pay: '$15–22/hr',
    coachPrompt: 'I want to start babysitting to earn money. How do I get my first clients safely, what should I charge in Hudson County, and what should parents expect from me? Should I get CPR certified?',
  },
  {
    emoji: '🐕',
    title: 'Dog walking & pet sitting',
    blurb: 'Buildings full of dogs, owners at work all day. Walk two dogs a day and it adds up fast.',
    pay: '$10–20/walk',
    coachPrompt: 'I want to start a dog walking and pet sitting service in my neighborhood. How do I find my first customers, what do I charge per walk, and how do I stay safe and reliable?',
  },
  {
    emoji: '🌱',
    title: 'Yard work & odd jobs',
    blurb: 'Lawns, leaves, snow, garage cleanouts. Seasonal, physical, pays cash.',
    pay: '$20–50/job',
    coachPrompt: 'I want to earn money doing yard work, snow shoveling, and odd jobs for neighbors. How do I offer my services, price jobs fairly, and build repeat customers?',
  },
  {
    emoji: '📚',
    title: 'Tutoring younger kids',
    blurb: 'Good at math, reading, or an instrument? Parents pay for patient help with elementary schoolers.',
    pay: '$15–25/hr',
    coachPrompt: 'I want to tutor younger kids in subjects I\'m good at. How do I find families, structure a session, and what should I charge as a teen tutor?',
  },
  {
    emoji: '⛳',
    title: 'Caddying',
    blurb: 'Golf clubs hire caddies at 14 — outdoor work, great tips, and caddie scholarships are real.',
    pay: '$60–120/loop',
    coachPrompt: 'I\'m interested in caddying at a golf course near Hudson County, NJ. How do caddie programs work, how do I sign up at 14, and what is the Evans Scholarship?',
  },
  {
    emoji: '📱',
    title: 'Tech help for neighbors',
    blurb: 'Set up phones, TVs, and Wi-Fi for people who grew up without them. Easy for you, magic to them.',
    pay: '$15–30/visit',
    coachPrompt: 'I want to offer tech help (phone setup, TV, printers, Wi-Fi) to older neighbors for money. How do I offer this respectfully, what do I charge, and how do I stay safe?',
  },
]

export interface ProgramWindow {
  title: string
  company: string
  city: string
  min_age: number
  /** First month of the application window, 1–12 */
  opensMonth: number
  monthLabel: string
  /** Months (1–12) the program is live on the platform */
  activeMonths: number[]
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/**
 * Seasonal municipal programs from the curated directory — the biggest real
 * employers of 14–15 year olds. Derived from activeMonths so the calendar
 * can never drift from what ingestion actually activates.
 */
export function getProgramCalendar(): ProgramWindow[] {
  return LOCAL_SOURCES
    .filter((e) => e.min_age <= 15 && e.activeMonths.length < 12)
    .map((e) => {
      const opensMonth = Math.min(...e.activeMonths)
      return {
        title: e.title,
        company: e.company,
        city: e.city,
        min_age: e.min_age,
        opensMonth,
        monthLabel: MONTHS[opensMonth - 1],
        activeMonths: e.activeMonths,
      }
    })
    .sort((a, b) => a.opensMonth - b.opensMonth)
}

export const WORKING_PAPERS_PROMPT =
  'Walk me through getting NJ working papers at MyWorkingPapers.nj.gov step by step. What do I need, how long does it take, and do I need a job offer first?'
