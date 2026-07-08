/**
 * EMPLOYTEENS — Proactive coach insights for the career page
 *
 * GET /api/coach-insights → { insights: CoachInsight[] }
 * Auth: user session (RLS applies via the request-scoped client).
 * The career page renders these as tappable chips; tapping one sends the
 * insight's prompt into the coach chat.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchCoachContext } from '@/lib/ai/coach-context'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ insights: [] })

    const ctx = await fetchCoachContext(supabase, user.id)
    return NextResponse.json({ insights: ctx.insights })
  } catch {
    return NextResponse.json({ insights: [] })
  }
}
