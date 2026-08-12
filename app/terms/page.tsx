/**
 * EMPLOYTEENS — terms of service
 *
 * Two things App Review specifically looks for in a job-listing app used by
 * minors, both handled below rather than buried:
 *
 *   WE ARE NOT THE EMPLOYER. A job board that reads as though it places people
 *   invites both a rejection and a real liability, because a teen who is
 *   underpaid or hurt at work will look at whoever they think hired them. The
 *   "What EmployTeens is not" section says it in the first screen.
 *
 *   SAFETY IS A TERM, NOT A FOOTNOTE. Teens meeting strangers for casual work —
 *   babysitting, dog walking, yard work — is a genuine risk this product
 *   creates by promoting that work. It gets its own section, in the imperative.
 *
 * Written to be understood by a 14-year-old, because a term a 14-year-old
 * cannot read is not a term they agreed to. That is also the reading most
 * consumer-protection regulators take of minors' contracts.
 *
 * NOT LEGAL ADVICE, and this one especially should be reviewed by a lawyer
 * before launch: the liability and arbitration language here is deliberately
 * mild and untested.
 */

import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — EmployTeens',
  description: 'The rules for using EmployTeens, in plain language.',
}

const UPDATED = 'August 10, 2026'
const CONTACT = 'th3nastynay@gmail.com'

export default function TermsPage() {
  return (
    <main style={{ background: 'var(--et-surface)', minHeight: '100vh' }}>
      <div style={wrap}>
        <Link href="/" style={back}>← EmployTeens</Link>

        <h1 className="display display-xl" style={{ marginTop: 18, lineHeight: 1.15 }}>Terms of Service</h1>
        <p style={meta}>Last updated {UPDATED}</p>

        <p style={lede}>
          These are the rules for using EmployTeens. We have kept them short and in normal
          words, because terms a 14-year-old cannot read are not terms a 14-year-old agreed to.
          Using the app means you accept them.
        </p>

        <H>What EmployTeens is not</H>
        <p style={p}>
          <b>We are not an employer, a recruiter, or an employment agency.</b> We do not hire
          anyone, we are not paid by employers to list them, and we have no say in who gets a
          job. We find public job postings, check the links still work, and show you the ones
          that fit your age and schedule. Everything after you tap Apply is between you and
          that employer.
        </p>
        <p style={p}>
          That means we cannot promise a listing is accurate, that the job still exists, that
          the pay is what it says, or that the employer will treat you fairly. We check what we
          reasonably can and we take listings down when we find out they are dead or dodgy, but
          we are not standing behind the employer.
        </p>

        <H>Who can use it</H>
        <ul style={ul}>
          <li style={li}>You must be at least 13 to create an account. The app is designed for ages 14 to 19.</li>
          <li style={li}>If you are under 18, we strongly suggest telling a parent or guardian you are using it.</li>
          <li style={li}>One account per person. Use your real age — the whole app depends on it, because what we are allowed to show you is set by law and by your age.</li>
        </ul>

        <H>Staying safe, which matters more than the rest of this page</H>
        <p style={p}>
          Some work we tell you about — babysitting, dog walking, yard work, tutoring — means
          going to a stranger&rsquo;s home. That is normal work for a teenager and it is also
          the part of this app with real risk in it. So:
        </p>
        <ul style={ul}>
          <li style={li}>Tell a parent or guardian where you are going and when you expect to be back, every time.</li>
          <li style={li}>Try to work first for people your family already knows.</li>
          <li style={li}>Meet a new client for the first time in a public place, or with an adult you trust present.</li>
          <li style={li}>Never share your home address, your school schedule, or photos of yourself with someone you have not met through someone you trust.</li>
          <li style={li}>
            If a &ldquo;job&rdquo; asks you to pay money up front, cash a cheque, receive and
            forward packages, or buy gift cards, it is a scam. Stop, and tell us at{' '}
            <a href={`mailto:${CONTACT}`} style={link}>{CONTACT}</a>.
          </li>
          <li style={li}>If something feels wrong, leave. You do not owe anyone an explanation and no job is worth it.</li>
        </ul>

        <H>The AI Coach</H>
        <p style={p}>
          The coach is software, not a person, and not a careers adviser, lawyer or accountant.
          It can be confidently wrong, including about pay rates, hiring ages and labour rules.
          Treat it as a well-read friend, not an authority. Anything that matters, check with
          the employer or an adult.
        </p>
        <p style={p}>
          It runs on a third-party AI service, and we ask your permission before sending
          anything to them. The privacy policy explains exactly what gets sent. There is a daily
          message limit so one person cannot run up the bill for everyone.
        </p>
        <p style={p}>
          Do not use the coach to produce anything false. If you ask it to invent experience you
          do not have, you are the one who has to sit in the interview and answer for it.
        </p>

        <H>References and vouching</H>
        <p style={p}>
          Only name someone as a reference if you actually intend to ask them, and only send the
          link to that person. Do not claim someone vouched for you when they have not. The app
          marks a reference as confirmed only when that adult clicks the link themselves, and we
          will not mark one confirmed on your say-so, because the entire value of it is that it
          is true.
        </p>

        <H>Rules for using the app</H>
        <p style={p}>Do not:</p>
        <ul style={ul}>
          <li style={li}>lie about your age or pretend to be someone else;</li>
          <li style={li}>scrape, copy or resell the listings;</li>
          <li style={li}>try to break, overload or get around limits in the service;</li>
          <li style={li}>use the app to harass anyone, or to post anything illegal.</li>
        </ul>
        <p style={p}>
          If you do these things we may suspend or delete your account. If you think that was a
          mistake, email us and a human will look at it.
        </p>

        <H>It is free</H>
        <p style={p}>
          EmployTeens costs nothing. There are no subscriptions, no in-app purchases and no ads.
          If that ever changes, existing features you already rely on will not be put behind a
          paywall without telling you well in advance.
        </p>

        <H>Your content</H>
        <p style={p}>
          Your resume, your messages and your profile are yours. You give us permission to store
          and display them so the app can work, and nothing more. We do not use them to train AI
          models, we do not sell them, and we do not publish them. Delete your account and they
          are gone.
        </p>

        <H>If something goes wrong</H>
        <p style={p}>
          We provide EmployTeens as it is, and we cannot promise it will always be available or
          error-free. To the fullest extent the law allows, we are not liable for what happens
          between you and an employer, for a listing being wrong or out of date, or for advice
          the AI Coach gives you. Nothing here limits any right you have that cannot legally be
          limited, and in some places that includes rights minors have specifically.
        </p>

        <H>Ending it</H>
        <p style={p}>
          You can delete your account at any time from Profile → Account → Delete account, with
          no notice and no reason needed. We can close an account that breaks these terms. If we
          shut the service down entirely, we will give you notice and a way to get your data out
          first.
        </p>

        <H>Changes and contact</H>
        <p style={p}>
          If we change these terms meaningfully we will update the date above and tell you in the
          app. These terms are governed by the laws of the State of New Jersey.
        </p>
        <p style={p}>
          Questions, problems, or a listing that should not be there:{' '}
          <a href={`mailto:${CONTACT}`} style={link}>{CONTACT}</a>. A real person reads it.
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
