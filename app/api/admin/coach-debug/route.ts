/**
 * EMPLOYTEENS — AI Coach diagnostics
 * Reports which AI env vars exist and makes ONE non-streaming test call to
 * the provider, returning the raw status + body so failures are visible
 * instead of rendering as empty chat bubbles.
 *
 * GET /api/admin/coach-debug?secret=CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const qsSecret = req.nextUrl.searchParams.get('secret')
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && qsSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const env = {
    GROQ_API_KEY: process.env.GROQ_API_KEY ? `set (${process.env.GROQ_API_KEY.length} chars, starts ${process.env.GROQ_API_KEY.slice(0, 4)}…)` : 'MISSING',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `set (${process.env.GEMINI_API_KEY.length} chars)` : 'missing',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'missing',
  }

  let groqTest: Record<string, unknown> = { skipped: 'no GROQ_API_KEY' }
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Say OK.' }],
          max_tokens: 10,
          stream: false,
        }),
      })
      const body = await res.text()
      groqTest = { http_status: res.status, body: body.slice(0, 600) }
    } catch (err) {
      groqTest = { fetch_error: String(err).slice(0, 300) }
    }
  }

  return NextResponse.json({ env, groqTest })
}
