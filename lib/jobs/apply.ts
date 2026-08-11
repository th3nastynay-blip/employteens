/**
 * EMPLOYTEENS — the one place a job application is opened
 *
 * Extracted from JobCard so the detail sheet uses the identical path. Two
 * copies of this would drift, and the thing that drifts is the outcome
 * tracking — which is the platform's only real KPI.
 */

import { createClient } from '@/lib/supabase/client'
import { recordApplyClick } from '@/lib/apply-tracking'
import type { JobMatch } from '@/lib/types/database'

export async function openApplication(job: JobMatch): Promise<void> {
  const method = job.apply_method as 'url' | 'call' | 'text' | 'email' | undefined
  const isHumanContact = method === 'call' || method === 'text' || method === 'email'

  // Human-contact jobs: apply_url is a synthetic tel:/sms:/mailto: URI set at
  // ingest (see smb-phone-ingest.ts), so window.open hands off to the OS
  // dialler, Messages or Mail exactly as a plain <a href> would. Nothing here
  // needs to branch on method.
  window.open(job.apply_url, '_blank', 'noopener,noreferrer')

  // Opening the page is NOT applying. The click is recorded locally, and when
  // the teen comes back ApplyConfirmSheet asks "did you apply?" — only a
  // confirmed yes writes status='applied'. Conflating the two would inflate
  // the one number this product exists to move.
  recordApplyClick({
    id: job.id,
    title: job.title,
    company: job.company,
    contactMethod: isHumanContact ? (method as 'call' | 'text' | 'email') : undefined,
  })

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('analytics_events').insert({
      user_id: user.id,
      event_type: 'apply_click',
      job_id: job.id,
      metadata: {},
    })
  } catch {
    // Non-critical. Never block the apply action on analytics.
  }
}
