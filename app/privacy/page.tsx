/**
 * EMPLOYTEENS — privacy policy
 *
 * WRITTEN AGAINST WHAT THE CODE ACTUALLY DOES, not a template.
 *
 * App Review's most common privacy rejection is not a missing policy, it is a
 * policy that contradicts the app. A reviewer opens the coach, sees a request
 * carrying the user's profile to api.groq.com, and checks whether this page
 * says so. Every claim below maps to a real table or a real outbound call, and
 * anything the app stops doing has to come out of here the same day.
 *
 * The two guidelines this page exists to satisfy, quoted from Apple's own text:
 *
 *   5.1.2(i) "You must clearly disclose where personal data will be shared with
 *   third parties, including with third-party AI, and obtain explicit
 *   permission before doing so."
 *
 *   5.1.4(b) "apps ... that collect, transmit, or have the capability to share
 *   personal information ... from a minor must include a privacy policy and
 *   must comply with all applicable children's privacy statutes."
 *
 * Disclosure alone does NOT satisfy 5.1.2(i) — it also requires explicit
 * permission, which is a consent screen in the product, not a paragraph here.
 * See components/coach/AIConsent.tsx.
 *
 * NOT LEGAL ADVICE. This is an honest, specific description of the system by
 * the people who built it. Before launch it should be read by someone who
 * actually practises privacy law, particularly on minors' data.
 */

import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — EmployTeens',
  description: 'What EmployTeens collects, why, who sees it, and how to delete it.',
}

const UPDATED = 'August 10, 2026'
const CONTACT = 'th3nastynay@gmail.com'

export default function PrivacyPage() {
  return (
    <main style={{ background: 'var(--et-surface)', minHeight: '100vh' }}>
      <div style={wrap}>
        <Link href="/" style={back}>← EmployTeens</Link>

        <h1 className="display display-xl" style={{ marginTop: 18, lineHeight: 1.15 }}>Privacy Policy</h1>
        <p style={meta}>Last updated {UPDATED}</p>

        <p style={lede}>
          EmployTeens is used by people aged 14 to 19, so most of our users are minors. We
          have written this to be read, not to be survived. If anything here is unclear,
          email <a href={`mailto:${CONTACT}`} style={link}>{CONTACT}</a> and we will explain it.
        </p>

        <H>The short version</H>
        <ul style={ul}>
          <li style={li}>We collect what we need to match you to jobs, and nothing to sell.</li>
          <li style={li}>We do not sell your data. We do not share it with advertisers. There are no ads.</li>
          <li style={li}>There is no third-party analytics and no advertising SDK anywhere in this app.</li>
          <li style={li}>
            When you use the AI Coach, your message and parts of your profile are sent to an AI
            company to generate a reply. We ask your permission before that happens the first
            time, and the rest of the app works whether you agree or not.
          </li>
          <li style={li}>You can delete your entire account, and everything in it, from inside the app.</li>
        </ul>

        <H>What we collect</H>

        <Sub>Things you type in</Sub>
        <ul style={ul}>
          <li style={li}><b>Account:</b> your email address and a password, handled by our login provider.</li>
          <li style={li}>
            <b>Profile:</b> first name, age, school grade, roughly when your school day ends,
            your state and ZIP code, how you get around, which days you are free, your skills
            and interests, and whether you have working papers.
          </li>
          <li style={li}>
            <b>Reference:</b> the name, role and organisation of an adult you ask to vouch for
            you, plus whether they confirmed. See “About the adult you name” below.
          </li>
          <li style={li}>
            <b>Resume:</b> whatever you put in it, which may include your full name, phone
            number, email, school and work history.
          </li>
          <li style={li}>
            <b>Coach conversations:</b> the messages you send the AI Coach and the replies you
            get, kept so you can reopen a chat later.
          </li>
        </ul>

        <Sub>Things the app records as you use it</Sub>
        <ul style={ul}>
          <li style={li}>Jobs you save, apply to, and what happened with them.</li>
          <li style={li}>Basic in-app events, such as opening a listing, stored in our own database.</li>
          <li style={li}>A count of how many coach messages you have sent today, to enforce a daily limit.</li>
        </ul>

        <Sub>What we do not collect</Sub>
        <p style={p}>
          We do not ask for your home address, your photo, your contacts, your precise GPS
          location, your Social Security number, or any payment information. We use your ZIP
          code to estimate distance, never your device location.
        </p>

        <H>The AI Coach, specifically</H>
        <p style={p}>
          The AI Coach is powered by a third-party AI provider. Today that provider is{' '}
          <b>Groq, Inc.</b>, running the Llama 3.3 model. To answer you usefully, we send them:
        </p>
        <ul style={ul}>
          <li style={li}>the messages in your current conversation;</li>
          <li style={li}>
            context from your profile — your first name, age, grade, state and ZIP code, your
            availability, transport, skills and interests;
          </li>
          <li style={li}>a short summary of jobs matched to you and applications you have made.</li>
        </ul>
        <p style={p}>
          We ask for your explicit permission before the first time this happens, and we name
          the provider when we ask. If you say no, the coach stays off and every other part of
          EmployTeens works exactly as normal. You can withdraw permission at any time from
          your profile, which also stops any further data going to them.
        </p>
        <p style={p}>
          Replies are generated by software. They can be wrong, including about pay, hiring
          ages and labour rules, and they are not legal or financial advice. Check anything
          that matters with the employer or with an adult you trust.
        </p>

        <H>About the adult you name as a reference</H>
        <p style={p}>
          When you ask someone to vouch for you, we store their name and role because you
          typed them, and we create a one-time link for you to send them yourself. We do not
          email them, we do not add them to any list, and we do not contact them again. If
          they open the link we record only that they confirmed or declined and the name they
          gave. They never need an account.
        </p>
        <p style={p}>
          Only enter someone&rsquo;s details if you actually intend to ask them. If you are an
          adult who was named without your knowledge and want that removed, email us and we
          will remove it.
        </p>

        <H>Who else touches your data</H>
        <p style={p}>
          We use a small number of companies to run the service. They process data on our
          instructions and are not permitted to use it for their own purposes.
        </p>
        <ul style={ul}>
          <li style={li}><b>Supabase</b> — database, storage and login. Holds everything listed above.</li>
          <li style={li}><b>Vercel</b> — hosting. Handles requests from your device, including IP addresses in standard server logs.</li>
          <li style={li}><b>Groq</b> — AI replies, only after you agree. Receives what is listed in the AI Coach section.</li>
          <li style={li}><b>Google Fonts</b> — the typefaces on this site, so Google may see your IP address when a page loads.</li>
        </ul>
        <p style={p}>
          That is the complete list. No advertising network, no tracking pixel, no data broker,
          no third-party analytics.
        </p>

        <H>Because our users are minors</H>
        <p style={p}>
          EmployTeens is not intended for children under 13 and we do not knowingly collect
          data from them. If you are under 13, please do not create an account. If we learn an
          account belongs to someone under 13, we will delete it.
        </p>
        <p style={p}>
          If you are under 18, we suggest telling a parent or guardian that you use this app,
          and we deliberately keep what we ask for to a minimum so there is less about you to
          protect. A parent or guardian can email us to see what we hold about their child or
          to have it deleted, and we will act once we can reasonably confirm the relationship.
        </p>

        <H>How long we keep things</H>
        <ul style={ul}>
          <li style={li}>Profile, resume and applications: until you delete them, or delete your account.</li>
          <li style={li}>Coach conversations: until you delete the chat or your account. Any single chat can be deleted from the coach&rsquo;s history drawer.</li>
          <li style={li}>Daily coach message counts: 90 days.</li>
          <li style={li}>Server logs held by our hosting providers: their standard retention, typically around 30 days.</li>
        </ul>

        <H>Deleting your account</H>
        <p style={p}>
          Profile → Account → Delete account. It is immediate and permanent. It removes your
          profile, saved and applied jobs, coach conversations, resume and reference record. We
          do not keep a shadow copy, there is nothing to email us for, and there is no waiting
          period.
        </p>

        <H>Your rights</H>
        <p style={p}>
          Depending on where you live you may have the right to see the data we hold about you,
          correct it, delete it, or object to how we use it. Most of that you can do yourself in
          the app. For anything else, email{' '}
          <a href={`mailto:${CONTACT}`} style={link}>{CONTACT}</a> and we will respond within 30
          days. We will never charge you for a request, and we will never make the service worse
          for you because you made one.
        </p>

        <H>Security, honestly stated</H>
        <p style={p}>
          Your data is stored with row-level security, meaning the database itself enforces that
          only your account can read your rows. Traffic is encrypted in transit. No system is
          perfectly secure and we are not going to pretend otherwise. If we ever discover a
          breach affecting your data, we will tell you what happened and what to do about it.
        </p>

        <H>Changes</H>
        <p style={p}>
          If we change how we handle your data in a way that matters, we will update the date at
          the top and tell you in the app before it takes effect. We will not quietly start
          sharing your data with someone new.
        </p>

        <H>Contact</H>
        <p style={p}>
          <a href={`mailto:${CONTACT}`} style={link}>{CONTACT}</a>
          <br />
          EmployTeens · Hudson County, New Jersey, USA
        </p>

        <div style={{ height: 60 }} />
      </div>
    </main>
  )
}

/* ── Presentation ─────────────────────────────────────────────────────── */

const wrap: React.CSSProperties = {
  maxWidth: 680, margin: '0 auto', padding: '40px 22px 0',
  color: 'var(--et-ink)', fontSize: '15px', lineHeight: 1.65,
}
const back: React.CSSProperties = { fontSize: '13px', color: 'var(--et-muted)', textDecoration: 'none', fontWeight: 600 }
const meta: React.CSSProperties = { fontSize: '12.5px', color: 'var(--et-placeholder)', marginTop: 8 }
const lede: React.CSSProperties = { marginTop: 22, fontSize: '16px', lineHeight: 1.65, color: 'var(--et-subtle)' }
const p: React.CSSProperties = { marginTop: 12, color: 'var(--et-subtle)' }
const ul: React.CSSProperties = { marginTop: 12, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }
const li: React.CSSProperties = { color: 'var(--et-subtle)' }
const link: React.CSSProperties = { color: 'var(--et-blue)', textDecoration: 'underline' }

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="display display-md" style={{ marginTop: 34 }}>{children}</h2>
}
function Sub({ children }: { children: React.ReactNode }) {
  return <h3 style={{ marginTop: 20, fontSize: '14px', fontWeight: 700 }}>{children}</h3>
}
