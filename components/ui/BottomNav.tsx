'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Feed',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="2" width="8" height="9" rx="2" fill={active ? '#3B82F6' : '#9CA3AF'} />
        <rect x="12" y="2" width="8" height="5" rx="2" fill={active ? '#3B82F6' : '#9CA3AF'} />
        <rect x="2" y="13" width="8" height="7" rx="2" fill={active ? '#3B82F6' : '#9CA3AF'} />
        <rect x="12" y="9" width="8" height="11" rx="2" fill={active ? '#3B82F6' : '#9CA3AF'} />
      </svg>
    ),
  },
  {
    href: '/jobs/saved',
    label: 'Saved',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M6 3H16C17.1 3 18 3.9 18 5V19L11 16L4 19V5C4 3.9 4.9 3 6 3Z" fill={active ? '#3B82F6' : 'none'} stroke={active ? '#3B82F6' : '#9CA3AF'} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/career',
    label: 'Career AI',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" stroke={active ? '#3B82F6' : '#9CA3AF'} strokeWidth="1.5" />
        <path d="M8 11.5L10 13.5L14 9" stroke={active ? '#3B82F6' : '#9CA3AF'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="8" r="4" stroke={active ? '#3B82F6' : '#9CA3AF'} strokeWidth="1.5" />
        <path d="M3 19C3 15.686 6.686 13 11 13C15.314 13 19 15.686 19 19" stroke={active ? '#3B82F6' : '#9CA3AF'} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-bottom">
      <div className="flex items-center justify-around px-4 py-2 max-w-sm mx-auto">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 px-3 py-1">
              {icon(active)}
              <span className={`text-xs font-medium ${active ? 'text-[#3B82F6]' : 'text-[#9CA3AF]'}`}>
                {label}
              </span>
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="w-1 h-1 rounded-full bg-[#3B82F6]"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
