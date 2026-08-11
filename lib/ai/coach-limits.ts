/**
 * EMPLOYTEENS — coach usage limits
 *
 * Enforced server-side with the service role, because a limit the browser can
 * edit is decoration. See supabase/migrations/add_coach_usage.sql for why the
 * counter lives in Postgres rather than in a module-level Map (Vercel functions
 * are stateless and horizontally scaled, so an in-memory counter enforces
 * nothing and merely looks like it works in testing).
 *
 * FAIL OPEN, NOT CLOSED. If the meter itself errors, the message goes through.
 * A billing control that takes the product down when the database hiccups has
 * traded a bounded cost problem for an unbounded trust problem, and the failure
 * lands on a teenager mid-conversation who has no idea why. The runaway case
 * this guards against is sustained, so a handful of leaked messages during an
 * outage is noise against the bill it prevents.
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Messages per user per UTC day.
 *
 * Set from what a real session costs rather than a round number: a teen working
 * through a resume with the coach sends roughly 15-25 turns, and every support
 * conversation worth having fits well inside 40. Past that it is either abuse or
 * someone using the coach as a general-purpose chatbot, neither of which we are
 * paying Opus rates for. Overridable without a deploy.
 */
export const COACH_DAILY_LIMIT = Number(process.env.COACH_DAILY_LIMIT ?? 40)

/** Warn the teen while they can still plan around it, not at zero. */
export const COACH_WARN_AT = 8

export interface UsageResult {
  allowed: boolean
  used: number
  remaining: number
  /** True when the meter itself failed and we let the message through. */
  degraded?: boolean
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Count this message and say whether it is allowed.
 *
 * Increments first and compares after, inside one atomic statement, so two
 * requests in the same tick cannot both read the pre-increment count. Doing the
 * check as read-then-write in TypeScript is the classic way to build a limit
 * that a fast client can hold open forever.
 */
export async function bumpCoachUsage(userId: string, estTokens = 0): Promise<UsageResult> {
  const supabase = serviceClient()
  if (!supabase) {
    return { allowed: true, used: 0, remaining: COACH_DAILY_LIMIT, degraded: true }
  }

  try {
    const { data, error } = await supabase.rpc('bump_coach_usage', {
      p_user_id: userId,
      p_limit: COACH_DAILY_LIMIT,
      p_tokens: estTokens,
    })
    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data
    if (!row) throw new Error('bump_coach_usage returned no row')

    return {
      allowed: Boolean(row.allowed),
      used: Number(row.used ?? 0),
      remaining: Number(row.remaining ?? 0),
    }
  } catch (e) {
    console.error('[coach-limits] meter failed, allowing through', e)
    return { allowed: true, used: 0, remaining: COACH_DAILY_LIMIT, degraded: true }
  }
}

/**
 * The over-limit reply, as a normal streamed message.
 *
 * Deliberately NOT an HTTP 429. The chat client reads SSE and renders anything
 * that is not SSE as a silent empty bubble, so a correct-looking status code
 * would present to the teen as the coach ignoring them. It also says when the
 * limit resets and what to do meanwhile, because "come back tomorrow" with no
 * timestamp reads as a soft ban.
 */
export function limitReachedStream(): Response {
  const encoder = new TextEncoder()
  const msg =
    `That is ${COACH_DAILY_LIMIT} messages today, which is the daily cap.\n\n` +
    `It resets at midnight UTC — about 7pm Eastern. Nothing you have written is lost.\n\n` +
    `If you were mid-resume, everything above is still here to copy, and the job feed and ` +
    `your profile work as normal in the meantime.`

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: msg } }] })}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Coach-Limit': 'reached',
    },
  })
}
