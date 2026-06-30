import { NextRequest } from 'next/server'
import { getStreamingChatResponse, type ChatMessage } from '@/lib/ai/career-ai'
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/lib/types/database'

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Missing messages' }), { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let userProfile: UserProfile | undefined
    if (user) {
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (data) userProfile = data as unknown as UserProfile
    }

    return await getStreamingChatResponse(messages as ChatMessage[], userProfile)
  } catch (err) {
    console.error('[AI Coach] Error:', err)
    return new Response(JSON.stringify({ error: 'AI unavailable' }), { status: 500 })
  }
}
