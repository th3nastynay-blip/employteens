import { NextRequest, NextResponse } from 'next/server'
import { callCareerAI, type CareerTool } from '@/lib/ai/career-ai'
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/lib/types/database'

export async function POST(req: NextRequest) {
  try {
    const { message, tool } = await req.json()

    if (!message || !tool) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user profile for context
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let userProfile: UserProfile | undefined
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      if (data) userProfile = data as unknown as UserProfile
    }

    const reply = await callCareerAI({
      message,
      tool: tool as CareerTool,
      userProfile,
    })

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[Career AI] Error:', err)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 500 })
  }
}
