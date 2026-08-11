import type { Metadata, Viewport } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'

/**
 * Two faces, on purpose.
 *
 * Outfit for headlines: geometric, rounded, single-storey 'a'. This is the
 * highest-leverage change in the redesign — what makes a site read as modern
 * rather than generic is almost always the display face, not the colour.
 *
 * Inter stays for body and UI. Outfit is lovely at 26px and gets muddy at 12px,
 * which is most of what a teen actually reads on a card.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'EmployTeens — AI Job Matches for NY/NJ Teens',
  description: 'AI finds jobs that fit your schedule, location, and age. Built for teens 14–19 in New York and New Jersey.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EmployTeens',
  },
  openGraph: {
    title: 'EmployTeens',
    description: 'AI job discovery for teens in NY/NJ',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
