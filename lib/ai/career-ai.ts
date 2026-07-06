/**
 * EMPLOYTEENS — AI Coach System
 * Provider: Google Gemini 2.0 Flash (free tier, no credit card required)
 * Get a key: https://aistudio.google.com → Get API key
 * Env var: GEMINI_API_KEY
 */

import type { UserProfile } from '@/lib/types/database'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface JobContext {
  topMatches: {
    title: string
    company: string
    location: string
    match_score: number
    match_explanation: string
    apply_url: string
    min_age: number
    pay: string | null
    hires_fast: boolean
    no_experience: boolean
  }[]
  recentApplications: {
    title: string | undefined
    company: string | undefined
    status: string
  }[]
}

function buildSystemPrompt(userProfile?: UserProfile, jobContext?: JobContext): string {
  const profile = userProfile
    ? `
## User Profile
- Name: ${userProfile.name}
- Age: ${userProfile.age}
- State: ${userProfile.state}, ZIP: ${userProfile.zip_code}
- Grade: ${userProfile.school_grade}, School ends: ${userProfile.school_end_time}
- Transportation: ${userProfile.transportation}
- Skills: ${(userProfile.skills as string[]).join(', ') || 'none listed'}
- Interests: ${(userProfile.interests as string[]).join(', ') || 'none listed'}
- Resume on file: ${userProfile.resume_url ? 'yes' : 'no'}
`
    : '\n## User Profile\nNot yet loaded — respond helpfully without profile context.\n'

  return `You are the AI Coach inside EmployTeens, a job discovery app for teens aged 14-19 in New York and New Jersey.

You are conversational, warm, and direct — like a smart older sibling who knows the job market. Never sound corporate or robotic. Use short paragraphs. Get to the point fast.
${profile}
## What You Can Help With
- Writing or improving a resume (tailored to teen with little or no experience)
- Interview prep (realistic questions + how to answer them)
- Application strategy (where/how to apply, timing, what to say)
- Handling rejection or ghosting from employers
- Figuring out which jobs fit their schedule, age, or skills
- Answering questions about specific companies (Chipotle, Target, Starbucks, McDonald's, AMC, etc.)
- Understanding work permits, minimum wage laws, and teen labor rules in NY/NJ

## Tone Rules
- Be specific — never give generic advice
- Use their name if you know it
- When giving steps, number them clearly
- Never say "Great question!" or use hollow affirmations
- Markdown is supported: use **bold**, bullet points, and numbered lists freely
- Keep responses under 300 words unless writing a resume or detailed document
- If they say something vague, ask one clarifying question instead of guessing

## Key Facts (NY/NJ Teen Labor)
- Minimum age to work in most retail/food: 14 (with work permit)
- NY minimum wage: $16/hr (NYC), $15/hr (rest of NY)
- NJ minimum wage: $15.49/hr
- Teens under 18 need an "Employment Certificate" (work permit) from their school
- Hours limits: 14-15 year olds can work max 3 hrs/day on school days, 8 hrs on non-school days
- Best companies that hire at 14-15: AMC Theatres, McDonald's, some grocery stores, Chick-fil-A

Always be accurate about these rules — incorrect labor law info could harm the user.

## CRITICAL RULES
- NEVER invent job listings. Only recommend jobs from the "Current Job Matches" section below.
- If asked "what jobs should I apply for?" or similar, reference ONLY the jobs listed below.
- If no jobs are listed or none match, say so honestly and give general strategy advice instead.
- When recommending a specific job, always include the company name, location, and match score.
${jobContext && jobContext.topMatches.length > 0 ? `
## Top Job Matches (use ONLY these when recommending jobs — do not invent others)
${jobContext.topMatches.slice(0, 8).map((j, i) =>
  `${i + 1}. ${j.title} @ ${j.company}, ${j.location} — ${j.match_score}% match. ${j.pay ?? 'Pay TBD'}. Age ${j.min_age}+. ${j.no_experience ? 'No exp needed.' : ''} ${j.hires_fast ? 'Hires fast.' : ''}`
).join('\n')}` : '\n## Job Matches: None yet — give general advice.\n'}
${jobContext && jobContext.recentApplications.length > 0 ? `
## User's Application History
${jobContext.recentApplications.map((a) => `- ${a.title} at ${a.company}: ${a.status}`).join('\n')}
` : ''}`
}

export async function getStreamingChatResponse(
  messages: ChatMessage[],
  userProfile?: UserProfile,
  jobContext?: JobContext,
): Promise<Response> {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return getFallbackStream(messages[messages.length - 1]?.content ?? '')
  }

  const systemPrompt = buildSystemPrompt(userProfile, jobContext)

  // Groq is OpenAI-compatible — no translation layer needed
  // llama-3.3-70b-versatile: free, fast, great quality
  let groqRes: globalThis.Response
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1000,
        temperature: 0.72,
        stream: true,
      }),
    })
  } catch (fetchErr) {
    console.error('[Groq] fetch error', fetchErr)
    return getFallbackStream(messages[messages.length - 1]?.content ?? '')
  }

  if (!groqRes.ok) {
    const errText = await groqRes.text()
    console.error('[Groq] HTTP error', groqRes.status, errText)
    if (groqRes.status === 429) {
      return getFallbackStream(messages[messages.length - 1]?.content ?? '')
    }
    return streamError(`AI error (${groqRes.status}): ${errText.slice(0, 150)}`)
  }

  // Groq returns standard OpenAI SSE — pass it straight through
  return new Response(groqRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// Stream a plain error message as if it were an AI response
function streamError(message: string): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: message } }] })}\n\n`
      controller.enqueue(encoder.encode(chunk))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}

function getFallbackStream(message: string): Response {
  const text = getFallbackResponse(message)
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for (const word of text.split(' ')) {
        const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: word + ' ' } }] })}\n\n`
        controller.enqueue(encoder.encode(chunk))
        await new Promise((r) => setTimeout(r, 28))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}

function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('resume')) {
    return `Here's a clean resume template:\n\n**YOUR NAME**\nPhone: (XXX) XXX-XXXX | Email: you@email.com | City, State\n\n**OBJECTIVE**\nEnergetic high school student seeking part-time work to build customer service and teamwork experience.\n\n**EDUCATION**\n[School Name], [City, State] — Expected graduation: [Year]\n\n**SKILLS**\n- Communication and customer service\n- Reliable and punctual\n- [Add any: cash handling, social media, cooking, etc.]\n\n**ACTIVITIES**\n- [School clubs, sports, volunteer work]\n- [Any informal work: babysitting, lawn care, tutoring]\n\nPro tip: Print 2 copies and bring them when you apply in person.`
  }

  if (lower.includes('interview')) {
    return `The 5 questions you'll almost always get:\n\n1. **"Tell me about yourself."** → Name, grade, why you want this job. 3 sentences max.\n2. **"Why do you want to work here?"** → Be specific. "I shop here a lot" actually works.\n3. **"What's your availability?"** → Be honest about school. Flexible on weekends is a plus.\n4. **"Do you have experience?"** → No job yet? Mention clubs, babysitting, or chores.\n5. **"How do you handle a difficult customer?"** → Stay calm, listen, get a manager if needed.\n\nWhat company are you interviewing at? I can give specific tips.`
  }

  if (lower.includes('reject') || lower.includes('ghosted')) {
    return `Normal — most people get rejected multiple times before their first job.\n\n1. **Apply somewhere else immediately.** Don't wait.\n2. **Follow up once** — a short call 5 days after applying shows initiative.\n3. **Apply in person** at your next target. Walking in beats online at most food/retail jobs.\n\nWhich company was it? I can help figure out what happened.`
  }

  if (lower.includes('permit') || lower.includes('work permit')) {
    return `You need **Working Papers** before you can legally work if you're under 18.\n\n1. Get a job offer first (employers will wait)\n2. Go to your school's main office\n3. Bring: birth certificate + signed letter from employer\n4. School issues the certificate — usually same day\n\nAnything else?`
  }

  return `I can help with resumes, interview prep, application strategy, and anything about getting a job in NY or NJ.\n\nWhat job are you going for? Give me specifics and I'll give you a real plan.`
}
