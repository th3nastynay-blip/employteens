/**
 * EMPLOYTEENS — AI Coach System
 * Unified conversational AI with full user context
 */

import type { UserProfile } from '@/lib/types/database'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function buildSystemPrompt(userProfile?: UserProfile): string {
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

Always be accurate about these rules — incorrect labor law info could harm the user.`
}

export async function getStreamingChatResponse(
  messages: ChatMessage[],
  userProfile?: UserProfile,
): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    // Fallback: simulate a helpful response as a stream
    const fallback = getFallbackResponse(messages[messages.length - 1]?.content ?? '')
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Stream word by word for a natural feel
        const words = fallback.split(' ')
        for (const word of words) {
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

  const systemPrompt = buildSystemPrompt(userProfile)

  const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: 0.72,
      stream: true,
    }),
  })

  if (!openAIRes.ok) {
    throw new Error(`OpenAI error: ${openAIRes.status}`)
  }

  return new Response(openAIRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('resume')) {
    return `Here's a clean resume template for you:\n\n**YOUR NAME**\nPhone: (XXX) XXX-XXXX | Email: you@email.com | City, State\n\n**OBJECTIVE**\nEnergetic high school student seeking part-time work to build customer service and teamwork experience.\n\n**EDUCATION**\n[School Name], [City, State] — Expected graduation: [Year]\n\n**SKILLS**\n- Communication and customer service\n- Reliable and punctual\n- Teamwork\n- [Add any: cash handling, social media, cooking, etc.]\n\n**ACTIVITIES**\n- [School clubs, sports, volunteer work]\n- [Any informal work: babysitting, lawn care, tutoring]\n\n**REFERENCES** Available upon request\n\nPro tip: Print 2 copies and bring them when you apply in person.`
  }

  if (lower.includes('interview')) {
    return `Here are the 5 most common questions you'll face:\n\n1. **"Tell me about yourself."** → Name, grade, why you want this job. Keep it to 3 sentences.\n\n2. **"Why do you want to work here?"** → Be specific. "I shop here a lot" actually works.\n\n3. **"What's your availability?"** → Be honest about school. Say you're flexible on weekends.\n\n4. **"Do you have experience?"** → No job yet? Mention school clubs, babysitting, or chores. Everything counts.\n\n5. **"How do you handle a difficult customer?"** → Stay calm, listen, get a manager if needed.\n\nWhat company are you interviewing at? I can give you more specific tips.`
  }

  if (lower.includes('reject') || lower.includes('didn\'t get') || lower.includes('ghosted')) {
    return `That's frustrating, but it's completely normal — most people get rejected multiple times before landing their first job.\n\nHere's what to do:\n\n1. **Apply somewhere else immediately.** Don't wait. Cast a wide net.\n2. **Follow up once** — a short email or call 5 days after applying shows initiative.\n3. **Apply in person** at your next target. Walking in beats an online application at most food/retail jobs.\n4. **Ask for feedback** if you made it to an interview — some managers will actually tell you.\n\nWhich company rejected you? I can help you figure out what likely happened and how to improve.`
  }

  if (lower.includes('permit') || lower.includes('work permit') || lower.includes('certificate')) {
    return `You'll need a **Working Papers** (Employment Certificate) before you can work if you're under 18.\n\n**How to get it:**\n1. Get a job offer first (most employers will wait)\n2. Go to your school's main office and ask for working papers\n3. Bring: your birth certificate + a signed letter from your employer\n4. School issues the certificate — usually same day\n\nIf school is out, go to your district's main administrative office.\n\n**NY teens:** Your employer keeps the certificate on file.\n**NJ teens:** Same process, issued by school.\n\nAnything else you need to know?`
  }

  return `I can help you with resumes, interview prep, application strategy, and anything else about getting your first job in NY or NJ.\n\nWhat's on your mind? Tell me what job you're going for and I'll give you specific advice.`
}
