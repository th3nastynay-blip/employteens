import Link from 'next/link'

export const metadata = { title: 'Terms of Service — EmployTeens' }

const S = {
  h2: { fontSize: '17px', fontWeight: 700 as const, color: 'var(--et-ink)', marginTop: 28, marginBottom: 8, letterSpacing: '-0.01em' },
  p: { fontSize: '14px', color: 'var(--et-subtle)', lineHeight: 1.65, marginBottom: 10 },
}

export default function TermsPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--et-surface)' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" style={{ fontSize: '13px', color: 'var(--et-blue)', fontWeight: 600 }}>← EmployTeens</Link>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--et-ink)', letterSpacing: '-0.03em', marginTop: 16 }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--et-placeholder)', marginTop: 4 }}>Effective July 13, 2026</p>

        <h2 style={S.h2}>1. What EmployTeens is</h2>
        <p style={S.p}>
          EmployTeens is a job-discovery service that finds, verifies, and recommends employment
          opportunities for teenagers ages 14–19 in New York and New Jersey. We are a discovery and
          guidance tool — we are not an employer, staffing agency, or hiring party, and we are not a
          party to any application, interview, or employment relationship you enter with an employer.
        </p>

        <h2 style={S.h2}>2. Eligibility and accounts</h2>
        <p style={S.p}>
          You must be 14 or older to use EmployTeens. You agree to provide accurate information —
          especially your age, which controls which jobs you can see. You are responsible for
          activity on your account. You can delete your account at any time from your profile.
        </p>

        <h2 style={S.h2}>3. Job listings</h2>
        <p style={S.p}>
          We verify listings automatically and continuously — checking that application links work,
          point to the actual employer, and appear age-appropriate. We work hard at this, but we
          cannot guarantee any listing&apos;s accuracy, availability, or outcome. Employers control
          their own postings, hiring decisions, pay, and requirements. Always confirm details,
          including minimum age and working-papers requirements, with the employer.
        </p>

        <h2 style={S.h2}>4. AI features</h2>
        <p style={S.p}>
          Match scores and AI Coach responses are automated assistance, not professional, legal, or
          career advice. The Coach can make mistakes — use judgment, and confirm important facts
          (like labor rules and age requirements) with official sources.
        </p>

        <h2 style={S.h2}>5. Acceptable use</h2>
        <p style={S.p}>
          Don&apos;t misrepresent your identity or age, interfere with the service, scrape or resell
          our data, or use EmployTeens for anything unlawful. We may suspend accounts that do.
        </p>

        <h2 style={S.h2}>6. Disclaimers and liability</h2>
        <p style={S.p}>
          EmployTeens is provided &quot;as is.&quot; To the fullest extent permitted by law, we
          disclaim warranties and are not liable for indirect, incidental, or consequential damages
          arising from use of the service, including outcomes of applications or employment. Nothing
          in these terms limits liability that cannot be limited by law.
        </p>

        <h2 style={S.h2}>7. Changes, governing law, contact</h2>
        <p style={S.p}>
          We may update these terms; material changes will be noted in the app. These terms are
          governed by the laws of the State of New Jersey. Questions:{' '}
          <a href="mailto:th3nastynay@gmail.com" style={{ color: 'var(--et-blue)' }}>th3nastynay@gmail.com</a>.
        </p>

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--et-border)' }}>
          <Link href="/privacy" style={{ fontSize: '13px', color: 'var(--et-blue)', fontWeight: 600, marginRight: 16 }}>Privacy Policy</Link>
          <Link href="/support" style={{ fontSize: '13px', color: 'var(--et-blue)', fontWeight: 600 }}>Support</Link>
        </div>
      </div>
    </main>
  )
}
