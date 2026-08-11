/**
 * EMPLOYTEENS — coach endpoint
 *
 * Order matters here and it is not the obvious one.
 *
 *   1. Identify the user.
 *   2. Meter them.  <- BEFORE any model call
 *   3. Fetch context.
 *   4. Stream.
 *
 * Metering has to come before the expensive call, because the point of the meter
 * is not to count messages, it is to not pay for them. Checking after the stream
 * opens produces a tidy usage table and an identical invoice.
 *
 * Anonymous callers get no model at all. The coach sits behind auth in the UI,
 * but this route is a public HTTPS endpoint, and an unauthenticated path to a
 * frontier model is an open relay billed to a personal card. No user means no
 * meter, and no meter means no limit.
 */

import { NextRequest } from 'next/server'
import { getStreamingChatResponse, type ChatMessage } from '@/lib/ai/career-ai'
import { fetchCoachContext, type CoachContext } from '@/lib/ai/coach-context'
import { bumpCoachUsage, limitReachedStream } from '@/lib/ai/coach-limits'
import { createClient } from '@/lib/supabase/server'

/** SSE, because the client renders anything that is not SSE as a silent empty bubble. */
function sse(message: string, headers: Record<string, string> = {}): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: message } }] })}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...headers },
  })
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json().catch(() => ({ messages: null }))

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: 'Missing messages' }), { status: 400 })
  }

  // Cheap guard against a pasted book driving one enormous prompt. Well above
  // any real conversation.
  const totalChars = (messages as ChatMessage[]).reduce((n, m) => n + (m?.content?.length ?? 0), 0)
  if (totalChars > 60_000) {
    return sse('That is a lot of text at once — trim it down and send the part you want help with.')
  }

  let userId: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch (e) {
    console.error('[AI Coach] auth lookup failed', e)
  }

  if (!userId) {
    return sse('Sign in and I can help — I need your profile to give you anything specific.', {
      'X-Coach-Auth': 'required',
    })
  }

  // ── Meter, before spending anything ──
  const usage = await bumpCoachUsage(userId, Math.ceil(totalChars / 4))
  if (!usage.allowed) return limitReachedStream()

  let ctx: CoachContext = { insights: [] }
  try {
    const supabase = await createClient()
    ctx = await fetchCoachContext(supabase, userId)
  } catch (dbErr) {
    // Best effort. A coach with no context still beats an error bubble.
    console.error('[AI Coach] DB context error:', dbErr)
  }

  try {
    const res = await getStreamingChatResponse(
      messages as ChatMessage[],
      ctx.userProfile,
      ctx.jobContext,
      { insights: ctx.insights },
    )
    // Surfaced so the UI can warn before zero rather than only at the wall.
    const headers = new Headers(res.headers)
    headers.set('X-Coach-Remaining', String(usage.remaining))
    return new Response(res.body, { status: res.status, headers })
  } catch (err) {
    console.error('[AI Coach] streaming setup error:', err)
    return sse('Something went wrong on my end — try that again in a second.')
  }
}
