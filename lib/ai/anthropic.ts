/**
 * EMPLOYTEENS — Anthropic streaming, translated to OpenAI SSE
 *
 * WHY A TRANSLATION LAYER RATHER THAN THE SDK
 *
 * The coach client in app/(app)/career/page.tsx parses one wire format:
 *
 *     data: {"choices":[{"delta":{"content":"..."}}]}
 *     data: [DONE]
 *
 * Groq speaks it natively. Anthropic does not — it emits typed events
 * (message_start, content_block_delta, message_stop) with a different shape.
 * Translating here means the browser code, the error paths and the fallback all
 * stay exactly as they are, and swapping providers is a server concern rather
 * than a rewrite of the chat UI. Roughly forty lines to avoid touching the one
 * file where a regression is most visible to the user.
 *
 * THE MODEL NAME IS AN ENV VAR ON PURPOSE. Model IDs get deprecated on a
 * schedule and the failure mode is a hard 404 on every coach message. Nayan can
 * change ANTHROPIC_MODEL in Vercel and redeploy nothing.
 *
 * NEVER THROWS. Returns null on any failure — missing key, HTTP error, network
 * — so the caller can fall through to Groq. A coach that says nothing is worse
 * than a coach running a cheaper model, and Anthropic being down should not
 * take the feature down with it.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-5'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/** One OpenAI-shaped SSE frame. */
function frame(text: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`
}

/**
 * Anthropic requires the first turn to be from the user and roles to alternate.
 * A client-side history can violate both — a stray leading assistant greeting,
 * or two user turns after a failed send. Groq tolerates it; Anthropic 400s. So
 * normalise rather than trusting the caller.
 */
function normalise(messages: ChatTurn[]): ChatTurn[] {
  const out: ChatTurn[] = []
  for (const m of messages) {
    if (!m?.content?.trim()) continue
    if (out.length === 0 && m.role !== 'user') continue
    const prev = out[out.length - 1]
    if (prev && prev.role === m.role) {
      // Merge same-role neighbours instead of dropping one: the second turn is
      // usually the teen adding detail, and losing it makes the coach answer
      // the wrong question.
      prev.content += `\n\n${m.content}`
      continue
    }
    out.push({ role: m.role, content: m.content })
  }
  return out
}

export async function streamAnthropic(
  systemPrompt: string,
  messages: ChatTurn[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<Response | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const turns = normalise(messages)
  if (turns.length === 0) return null

  let res: globalThis.Response
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: opts.maxTokens ?? 1200,
        temperature: opts.temperature ?? 0.7,
        system: systemPrompt,
        messages: turns,
        stream: true,
      }),
    })
  } catch (e) {
    console.error('[Anthropic] fetch failed', e)
    return null
  }

  if (!res.ok || !res.body) {
    console.error('[Anthropic] HTTP', res.status, (await res.text().catch(() => '')).slice(0, 300))
    return null
  }

  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const upstream = res.body.getReader()

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await upstream.read()
      if (done) {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
        return
      }

      // Anthropic frames are `event: <type>\ndata: <json>\n\n`. Only the text
      // deltas matter; ping, message_start and usage events are dropped rather
      // than forwarded as empty content, which would make the typing indicator
      // flicker.
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const evt = JSON.parse(payload)
          if (evt.type === 'content_block_delta' && typeof evt.delta?.text === 'string') {
            controller.enqueue(encoder.encode(frame(evt.delta.text)))
          } else if (evt.type === 'error') {
            console.error('[Anthropic] stream error', evt.error)
          }
        } catch {
          // Partial JSON split across chunk boundaries. Skipping is correct:
          // the SSE line will arrive whole in a later read.
        }
      }
    },
    cancel() {
      void upstream.cancel()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      // So we can confirm from the network tab which model actually answered,
      // rather than trusting a comment. This is what makes the marketing claim
      // checkable instead of aspirational.
      'X-Coach-Model': ANTHROPIC_MODEL,
    },
  })
}
