/**
 * EMPLOYTEENS — Account deletion (App Store Guideline 5.1.1(v))
 *
 * Authenticated user deletes their OWN account. auth.users → public.users
 * cascades (schema FK ON DELETE CASCADE), and public.users cascades to
 * applications, job_matches, and analytics_events — one admin call wipes
 * everything. Immediate and irreversible, exactly as the privacy policy
 * promises.
 *
 * POST /api/account/delete   Auth: the user's own session (cookie)
 */

import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    // Identify the caller from their session — users can only delete themselves
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    // Service role performs the deletion (cascades through public schema)
    const admin = await createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      console.error('[account/delete]', error.message)
      return NextResponse.json({ error: 'Deletion failed — try again or email support' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account/delete]', err)
    return NextResponse.json({ error: 'Deletion failed — try again or email support' }, { status: 500 })
  }
}
