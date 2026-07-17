import Link from 'next/link'

export const metadata = { title: 'Support — EmployTeens' }

const S = {
  h2: { fontSize: '16px', fontWeight: 700 as const, color: 'var(--et-ink)', marginTop: 24, marginBottom: 6, letterSpacing: '-0.01em' },
  p: { fontSize: '14px', color: 'var(--et-subtle)', lineHeight: 1.6, marginBottom: 8 },
}

export default function SupportPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--et-surface)' }}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" style={{ fontSize: '13px', color: 'var(--et-blue)', fontWeight: 600 }}>← EmployTeens</Link>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--et-ink)', letterSpacing: '-0.03em', marginTop: 16 }}>
          Support
        </h1>
        <p style={{ ...S.p, marginTop: 12 }}>
          Email us anytime: <a href="mailto:th3nastynay@gmail.com" style={{ color: 'var(--et-blue)', fontWeight: 600 }}>th3nastynay@gmail.com</a>.
          We read everything, including notes from parents and guardians.
        </p>

        <h2 style={S.h2}>A job link is broken or looks wrong</h2>
        <p style={S.p}>
          Every listing is re-verified automatically, but postings can close between checks. Email us
          the job title and employer and we&apos;ll pull it immediately.
        </p>

        <h2 style={S.h2}>I&apos;m 14 or 15 and see few jobs</h2>
        <p style={S.p}>
          That&apos;s honest, not broken: most employers set their own minimum at 16. Your dashboard&apos;s
          Get Ready mode shows ways to earn now (no working papers needed), city programs that hire at
          15 (application windows open each spring), and everything that unlocks at 16.
        </p>

        <h2 style={S.h2}>Working papers</h2>
        <p style={S.p}>
          New Jersey issues working papers online at MyWorkingPapers.nj.gov. In New York, get an
          Employment Certificate through your school. The AI Coach can walk you through either.
        </p>

        <h2 style={S.h2}>Delete my account</h2>
        <p style={S.p}>
          Profile → Delete account removes everything immediately and permanently. Or email us and
          we&apos;ll do it for you.
        </p>

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--et-border)' }}>
          <Link href="/privacy" style={{ fontSize: '13px', color: 'var(--et-blue)', fontWeight: 600, marginRight: 16 }}>Privacy Policy</Link>
          <Link href="/terms" style={{ fontSize: '13px', color: 'var(--et-blue)', fontWeight: 600 }}>Terms of Service</Link>
        </div>
      </div>
    </main>
  )
}
