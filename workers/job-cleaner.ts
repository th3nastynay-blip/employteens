// @ts-nocheck
/**
 * EMPLOYTEENS — Job Cleaning System
 * Runs every 12 hours via cron
 * - Validates apply URLs (checks if they still resolve)
 * - Marks jobs inactive if not verified in 7 days
 * - Removes flagged/scam jobs
 */

import 'dotenv/config'
import { supabaseAdmin } from './lib/supabase-admin'

const MAX_AGE_DAYS = 7
const SCAM_THRESHOLD = 70
const BATCH_SIZE = 50

async function validateUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    })

    clearTimeout(timeout)
    return res.ok || res.status === 405 // 405 = method not allowed but URL exists
  } catch {
    return false
  }
}

async function cleanExpiredJobs() {
  console.log('\n🧹 Running job expiration check...')

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS)

  const { data: expiredJobs, error } = await supabaseAdmin
    .from('jobs')
    .select('id, title, company, last_verified_at')
    .eq('status', 'active')
    .or(`last_verified_at.is.null,last_verified_at.lt.${cutoffDate.toISOString()}`)
    .limit(200)

  if (error || !expiredJobs) {
    console.error('Failed to fetch expired jobs:', error)
    return
  }

  console.log(`Found ${expiredJobs.length} jobs to review for expiration`)

  let deactivated = 0
  for (const job of expiredJobs) {
    await supabaseAdmin
      .from('jobs')
      .update({ status: 'inactive' })
      .eq('id', job.id)
    deactivated++
  }

  console.log(`✅ Deactivated ${deactivated} expired jobs`)
}

async function validateJobUrls() {
  console.log('\n🔗 Validating job apply URLs...')

  const { data: jobs } = await supabaseAdmin
    .from('jobs')
    .select('id, title, company, apply_url')
    .eq('status', 'active')
    .order('last_verified_at', { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE)

  if (!jobs) return

  let valid = 0
  let invalid = 0

  for (const job of jobs) {
    const isValid = await validateUrl(job.apply_url)

    if (isValid) {
      await supabaseAdmin
        .from('jobs')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('id', job.id)
      valid++
    } else {
      console.log(`  ❌ Dead URL: ${job.title} @ ${job.company} — ${job.apply_url}`)
      await supabaseAdmin
        .from('jobs')
        .update({ status: 'inactive' })
        .eq('id', job.id)
      invalid++
    }

    // Rate limit — don't hammer URLs
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log(`✅ URL validation: ${valid} valid, ${invalid} dead`)
}

async function removeFlaggedJobs() {
  console.log('\n🛡️  Removing high-risk jobs...')

  const { data, error } = await supabaseAdmin
    .from('jobs')
    .update({ status: 'flagged' })
    .gte('scam_risk_score', SCAM_THRESHOLD)
    .eq('status', 'active')
    .select('count')

  console.log(`✅ Flagged high-risk jobs`)
}

async function cleanDuplicatesInDB() {
  console.log('\n🔄 Cleaning in-database duplicates...')

  // Find jobs with same title + company + state that were inserted separately
  const { data: jobs } = await supabaseAdmin
    .from('jobs')
    .select('id, title, company, state, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (!jobs) return

  const seen = new Map<string, string>()
  const toDeactivate: string[] = []

  for (const job of jobs) {
    const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}|${job.state}`
    if (seen.has(key)) {
      toDeactivate.push(job.id)
    } else {
      seen.set(key, job.id)
    }
  }

  if (toDeactivate.length > 0) {
    await supabaseAdmin
      .from('jobs')
      .update({ status: 'inactive' })
      .in('id', toDeactivate)
    console.log(`✅ Removed ${toDeactivate.length} in-DB duplicates`)
  } else {
    console.log('✅ No duplicates found')
  }
}

async function runCleaningCycle() {
  console.log('\n🚀 EmployTeens Job Cleaning System Starting...\n')
  const start = Date.now()

  await cleanExpiredJobs()
  await validateJobUrls()
  await removeFlaggedJobs()
  await cleanDuplicatesInDB()

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n✅ Cleaning cycle complete in ${elapsed}s\n`)
}

runCleaningCycle().catch(console.error)
