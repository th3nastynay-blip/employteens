'use client'

/**
 * EMPLOYTEENS — resume persistence
 *
 * Same pattern as lib/ai/coach-store.ts: direct Supabase through owner-only
 * RLS, and every function degrades rather than throwing if the migration has
 * not been run. A resume page that renders and cannot save is annoying; one
 * that white-screens on mount is a bug report.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { ResumeData } from './types'

/** Generated Database types predate this table. See coach-store for the same note. */
function db(): SupabaseClient {
  return createClient() as unknown as SupabaseClient
}

export async function loadResume(): Promise<Partial<ResumeData> | null> {
  try {
    const supabase = db()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('user_resumes')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw error
    return (data?.data as Partial<ResumeData>) ?? null
  } catch {
    return null
  }
}

export async function saveResume(data: ResumeData): Promise<boolean> {
  try {
    const supabase = db()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase
      .from('user_resumes')
      .upsert({ user_id: user.id, data, updated_at: new Date().toISOString() })
    if (error) throw error
    return true
  } catch {
    return false
  }
}
