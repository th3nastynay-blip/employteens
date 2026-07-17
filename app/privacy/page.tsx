import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — EmployTeens' }

const S = {
  h2: { fontSize: '17px', fontWeight: 700 as const, color: 'var(--et-ink)', marginTop: 28, marginBottom: 8, letterSpacing: '-0.01em' },
  p: { fontSize: '14px', color: 'var(--et-subtle)', lineHeight: 1.65, marginBottom: 10 },
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--et-surface)' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" style={{ fontSize: '13px', color: 'var(--et-blue)', fontWeight: 600 }}>← EmployTeens</Link>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--et-ink)', letterSpacing: '-0.03em', marginTop: 16 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--et-placeholder)', marginTop: 4 }}>Effective July 13, 2026</p>

        <p style={{ ...S.p, marginTop: 20 }}>
          EmployTeens is a job-discovery app for teenagers ages 14–19 in New York and New Jersey.
          Because our users are mostly minors, we keep this policy short, honest, and strict. We do not
          sell your data. We do not show ads. We do not use advertising or tracking SDKs.
        </p>

        <h2 style={S.h2}>Who can use EmployTeens</h2>
        <p style={S.p}>
          You must be at least 14 years old. Our systems reject profiles under 14. If we learn an
          account belongs to someone under 14, we delete it.
        </p>

        <h2 style={S.h2}>What we collect</h2>
        <p style={S.p}>
          When you create an account and complete onboarding we collect: your name, email address,
          age, school grade and end-of-school time, ZIP code and state, transportation options,
          weekly availability, interests and skills, and — only if you choose to add one — a resume.
          As you use the app we also store which jobs you save, which you tell us you applied to, and
          basic usage events (for example, that an apply button was tapped) so the product works and improves.
        </p>

        <h2 style={S.h2}>How we use it</h2>
        <p style={S.p}>
          One purpose: matching you with verified, age-appropriate jobs near you and helping you get
          hired. Your age gates which jobs you can see (a 14-year-old is never shown a 16+ job), your
          ZIP powers distance matching, and your schedule and interests power recommendations and the
          AI Coach&apos;s advice.
        </p>

        <h2 style={S.h2}>AI processing</h2>
        <p style={S.p}>
          Job matching runs on our own servers. When you chat with the AI Coach, your messages and
          relevant profile context (age, schedule, matches, application history) are sent to Groq,
          Inc., our AI language-model provider, to generate the response. We do not permit our
          providers to use your data to train their models under our service configuration.
        </p>

        <h2 style={S.h2}>Where your data lives</h2>
        <p style={S.p}>
          Data is stored with Supabase (database and authentication) and served through Vercel
          (hosting). Both are bound by their own security and data-processing commitments.
        </p>

        <h2 style={S.h2}>What we never do</h2>
        <p style={S.p}>
          We never sell your personal information. We never share it with advertisers. We never send
          your information to employers — when you apply to a job, you apply directly on the
          employer&apos;s own site; EmployTeens is not part of that submission.
        </p>

        <h2 style={S.h2}>Deleting your account</h2>
        <p style={S.p}>
          You can permanently delete your account and all associated data anytime from Profile →
          Delete account, or by emailing us. Deletion is immediate and irreversible: profile, saved
          jobs, applications, matches, and usage events are all removed.
        </p>

        <h2 style={S.h2}>Parents and guardians</h2>
        <p style={S.p}>
          If you have questions about your teen&apos;s account or want it removed, email us at the
          address below and we will act promptly.
        </p>

        <h2 style={S.h2}>Changes and contact</h2>
        <p style={S.p}>
          If this policy changes materially, we will note it in the app. Questions, concerns, or
          deletion requests: <a href="mailto:th3nastynay@gmail.com" style={{ color: 'var(--et-blue)' }}>th3nastynay@gmail.com</a>.
        </p>

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--et-border)' }}>
          <Link href="/terms" style={{ fontSize: '13px', color: 'var(--et-blue)', fontWeight: 600, marginRight: 16 }}>Terms of Service</Link>
          <Link href="/support" style={{ fontSize: '13px', color: 'var(--et-blue)', fontWeight: 600 }}>Support</Link>
        </div>
      </div>
    </main>
  )
}
