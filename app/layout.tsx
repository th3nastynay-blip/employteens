import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'EmployTeens — Jobs for NY/NJ Teens',
  description: 'AI-powered job discovery for teens 14–19 in New York and New Jersey. No searching, just matches.',
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
  themeColor: '#3B82F6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[#FAFAFA] text-[#111111] antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
