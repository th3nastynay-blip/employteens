import { NextRequest } from 'next/server'
import { getStreamingChatResponse, type ChatMessage } from '@/lib/ai/career-ai'
import { fetchCoachContext, type CoachContext } from '@/lib/ai/coach-context'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { messages } = await req.json().catch(() => ({ messages: null }))

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Missing messages' }), { status: 400 })
  }

  let ctx: CoachContext = { insights: [] }

  // DB context is best-effort — if anything fails, still answer without context
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      ctx = await fetchCoachContext(supabase, user.id)
    }
  } catch (dbErr) {
    console.error('[AI Coach] DB context error:', dbErr)
  }

  return getStreamingChatResponse(
    messages as ChatMessage[],
    ctx.userProfile,
    ctx.jobContext,
    { insights: ctx.insights },
  )
}
