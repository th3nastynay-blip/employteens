/**
 * EMPLOYTEENS — Career AI System
 * Resume builder, interview simulator, job optimizer, application strategy
 */

import type { UserProfile } from '@/lib/types/database'

export type CareerTool = 'resume' | 'interview' | 'strategy' | 'optimize'

export interface CareerAIRequest {
  message: string
  tool: CareerTool
  userProfile?: UserProfile
  jobTitle?: string
  jobDescription?: string
}

// =============================================
// SYSTEM PROMPTS PER TOOL
// =============================================
const SYSTEM_PROMPTS: Record<CareerTool, string> = {
  resume: `You are an expert teen job counselor specializing in NY/NJ. You help teens aged 14-19 write strong, honest resumes for part-time jobs. When asked to build a resume:
- Keep it to 1 page, simple format
- Use bullet points with action verbs
- Focus on school activities, volunteer work, skills
- Make it honest — don't exaggerate
- Include: Contact info, Objective (2 lines), Skills, Education, Any Experience/Activities
- Format as plain text they can copy
Always be encouraging and realistic.`,

  interview: `You are a friendly teen job coach helping teens prepare for interviews. You give realistic, specific interview questions for the job they mention. After each question, provide a brief tip on how to answer it well. Be encouraging and practical. Focus on:
- Common retail/food service interview questions
- How to answer with no prior experience
- Body language tips
- What to wear
- Questions to ask the employer
Keep responses concise and teen-appropriate.`,

  strategy: `You are a teen job application strategist. When given a job title or description, provide a specific, actionable strategy to maximize the teen's chances:
- How to apply (in-person vs online — often in-person wins)
- Best time to apply
- What to say/bring
- Follow-up strategy
- Red flags to watch for
Be direct, practical, and specific. No fluff.`,

  optimize: `You are a job-fit analyzer for teen job seekers. When given a job description, analyze it and provide:
1. FIT SCORE (0-100) based on what a teen with no/little experience can realistically achieve
2. KEY REQUIREMENTS they meet vs. gaps
3. SPECIFIC TIPS to make their application stronger
4. RED FLAGS (if any — scam indicators, unrealistic pay, etc.)
Be honest, direct, and actionable.`,
}

// =============================================
// CAREER AI API CALL
// =============================================
export async function callCareerAI(req: CareerAIRequest): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    // Fallback responses without OpenAI
    return getFallbackResponse(req.tool, req.message)
  }

  const systemPrompt = SYSTEM_PROMPTS[req.tool]
  const userContext = req.userProfile
    ? `\n\nUser profile: ${req.userProfile.name}, age ${req.userProfile.age}, ${req.userProfile.state}, grade ${req.userProfile.school_grade}. Skills: ${(req.userProfile.skills as string[]).join(', ')}. Interests: ${(req.userProfile.interests as string[]).join(', ')}.`
    : ''

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt + userContext },
        { role: 'user', content: req.message },
      ],
      max_tokens: 800,
      temperature: 0.7,
    }),
  })

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? getFallbackResponse(req.tool, req.message)
}

// =============================================
// FALLBACK (no OpenAI key)
// =============================================
function getFallbackResponse(tool: CareerTool, message: string): string {
  if (tool === 'resume') {
    return `Here's a basic resume template you can customize:

---
YOUR NAME
Phone: (XXX) XXX-XXXX | Email: your@email.com | City, State ZIP

OBJECTIVE
Motivated high school student seeking part-time employment to develop customer service and teamwork skills.

EDUCATION
[Your School Name], [City, State]
Expected graduation: [Year] | GPA: [X.X] (optional)

SKILLS
• Customer service and communication
• Teamwork and collaboration
• Reliable and punctual
• [Add any specific skills: cash handling, computer skills, etc.]

ACTIVITIES & VOLUNTEER WORK
• [School clubs, sports teams, volunteer activities]
• [Any babysitting, lawn mowing, odd jobs — counts as experience!]

REFERENCES
Available upon request
---

Pro tip: Bring 2 printed copies when you apply in person!`
  }

  if (tool === 'interview') {
    return `Great! Here are common interview questions for entry-level jobs:

**"Tell me about yourself."**
💡 Tip: Keep it to 3 sentences — your name, grade, why you want this job.

**"Why do you want to work here?"**
💡 Tip: Be specific — mention something you like about the company.

**"What's your availability?"**
💡 Tip: Be honest about school hours. Mention weekends if you're free.

**"Do you have any experience?"**
💡 Tip: No job? That's fine. Mention school clubs, volunteering, babysitting.

**"How would you handle a difficult customer?"**
💡 Tip: Say you'd stay calm, listen, and get a manager if needed.

Practice these out loud before your interview. You've got this!`
  }

  if (tool === 'strategy') {
    return `Here's your application strategy:

**1. APPLY IN PERSON (often beats online)**
Walk in during slow hours (2-4pm weekdays, not weekends). Ask to speak with the manager directly.

**2. WHAT TO BRING**
• Resume (printed, 2 copies)
• Valid ID
• Social Security number
• School schedule

**3. WHAT TO SAY**
"Hi, I'm [Name]. I'm a [grade] student looking for part-time work. I'm available [days]. Is the manager available to speak with me?"

**4. FOLLOW UP**
If you apply online, call or visit 3-5 days later. Ask if they received your application.

**5. TIMING**
Best months: September (back to school hiring), November (holiday rush), May-June (summer hiring surge).`
  }

  return `I can help you with that! To get the most specific advice, please describe the job or paste the job description you're interested in, and I'll give you a detailed analysis.`
}
