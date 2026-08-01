/**
 * EMPLOYTEENS — Call/text/email-to-apply small business ingest runner
 *
 * Mirrors lib/jobs/local-ingest.ts exactly, but for lib/jobs/smb-phone-sources.ts
 * instead of the municipal-program directory. Lives in lib/ (not the route
 * file) for the same reason local-ingest.ts does — callable from both a
 * manual-trigger route and the GitHub Actions daily schedule.
 *
 * Only callableEntries() (humanVerifiedAt !== null) are ever passed into the
 * pipeline. Everything else in smb-phone-sources.ts is a researched-but-
 * unconfirmed candidate and must never reach the jobs table.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { ingestNormalizedJobs, type NormalizedJob } from '@/lib/jobs/ingest-pipeline'
import { callableEntries, type SmbPhoneEntry } from '@/lib/jobs/smb-phone-sources'

/**
 * 'call' and 'text' both ring/message the same number — the only difference
 * is which app the OS hands off to. tel: opens the dialer; sms: opens
 * Messages pre-addressed to the number, which is what actually lets a teen
 * text instead of cold-calling. 'email' opens a pre-filled mailto:.
 */
function applyUrlFor(e: SmbPhoneEntry): string {
  if (e.apply_method === 'email') return `mailto:${e.email}`
  if (e.apply_method === 'text') return `sms:${e.phone}`
  return `tel:${e.phone}`
}

export async function runSmbPhoneIngest(supabase: SupabaseClient<Database>) {
  const entries = callableEntries()

  // Orphan cleanup: an entry pulled from the directory (or one that never
  // got confirmed) shouldn't leave a stale row live — mirrors
  // local-ingest.ts's directory-drift handling. Covers all three human-
  // contact methods, not just phone.
  const directoryContactUrls = entries.map(applyUrlFor)
  const { data: liveContactJobs } = await supabase
    .from('jobs')
    .select('id, apply_url')
    .neq('apply_method', 'url')
    .eq('status', 'active')
  const orphans = (liveContactJobs ?? []).filter((r) => !directoryContactUrls.includes(r.apply_url))
  if (orphans.length > 0) {
    await supabase
      .from('jobs')
      .update({ status: 'inactive', is_active: false, verification_status: 'expired' })
      .in('id', orphans.map((o) => o.id))
  }

  const normalized: NormalizedJob[] = entries.map((e) => ({
    title: e.title,
    company: e.company,
    location: e.location,
    state: e.state,
    zip_code: e.zip_code,
    // Synthetic apply_url — satisfies the NOT NULL column and doubles as the
    // real tap-to-contact link the UI opens (tel:/sms:/mailto:).
    apply_url: applyUrlFor(e),
    description: e.contact_note,
    min_age: e.min_age,
    job_type: e.job_type,
    tags: e.tags,
    contactMethod: e.apply_method,
    contactPhone: e.phone_display,
    contactEmail: e.email,
    contactNote: e.contact_note,
    humanVerifiedAt: e.humanVerifiedAt ?? undefined,
    humanVerifiedBy: e.humanVerifiedBy ?? undefined,
    humanReverifyBy: e.humanReverifyBy ?? undefined,
  }))

  // alwaysVerify: re-checked every run, same reasoning as local-ingest.ts —
  // this is also how a passed humanReverifyBy date gets enforced daily
  // (ingest-pipeline.ts rejects + deactivates a stale entry automatically).
  return ingestNormalizedJobs(supabase, 'smb_phone', normalized, { alwaysVerify: true })
}
