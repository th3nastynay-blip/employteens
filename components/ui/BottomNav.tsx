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
        <rect x="2" y="2" width="8" height="9" rx="2.5"
          fill={active ? 'var(--et-blue)' : 'none'}
          stroke={active ? 'var(--et-blue)' : 'var(--et-placeholder)'}
          strokeWidth="1.5"
        />
        <rect x="12" y="2" width="8" height="5" rx="2.5"
          fill={active ? 'var(--et-blue)' : 'none'}
          stroke={active ? 'var(--et-blue)' : 'var(--et-placeholder)'}
          strokeWidth="1.5"
        />
        <rect x="2" y="13" width="8" height="7" rx="2.5"
          fill={active ? 'var(--et-blue)' : 'none'}
          stroke={active ? 'var(--et-blue)' : 'var(--et-placeholder)'}
          strokeWidth="1.5"
        />
        <rect x="12" y="9" width="8" height="11" rx="2.5"
          fill={active ? 'var(--et-blue)' : 'none'}
          stroke={active ? 'var(--et-blue)' : 'var(--et-placeholder)'}
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    href: '/jobs/saved',
    label: 'Saved',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path
          d="M5 4C5 3.44772 5.44772 3 6 3H16C16.5523 3 17 3.44772 17 4V18.382C17 18.7607 16.5724 18.9944 16.2764 18.7764L11 15.118L5.72361 18.7764C5.42762 18.9944 5 18.7607 5 18.382V4Z"
          fill={active ? 'var(--et-blue)' : 'none'}
          stroke={active ? 'var(--et-blue)' : 'var(--et-placeholder)'}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/career',
    label: 'AI Coach',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path
          d="M11 2C6.58172 2 3 5.36 3 9.5C3 11.55 3.87 13.4 5.3 14.72C5.46 14.87 5.55 15.07 5.55 15.28V17.5C5.55 17.78 5.77 18 6.05 18H15.95C16.23 18 16.45 17.78 16.45 17.5V15.28C16.45 15.07 16.54 14.87 16.7 14.72C18.13 13.4 19 11.55 19 9.5C19 5.36 15.4183 2 11 2Z"
          fill={active ? 'var(--et-blue)' : 'none'}
          stroke={active ? 'var(--et-blue)' : 'var(--et-placeholder)'}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M8.5 10L10 11.5L13.5 8"
          stroke={active ? 'white' : 'var(--et-placeholder)'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle
          cx="11" cy="7.5" r="3.5"
          fill={active ? 'var(--et-blue)' : 'none'}
          stroke={active ? 'var(--et-blue)' : 'var(--et-placeholder)'}
          strokeWidth="1.5"
        />
        <path
          d="M3 18.5C3 15.4624 6.68629 13 11 13C15.3137 13 19 15.4624 19 18.5"
          stroke={active ? 'var(--et-blue)' : 'var(--et-placeholder)'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav safe-bottom">
      <div className="flex items-center justify-around px-1 pt-2 pb-1 max-w-sm mx-auto">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl"
            >
              {active && (
                <motion.div
                  layoutId="nav-bg"
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: 'var(--et-blue-light)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 42 }}
                />
              )}
              <span className="relative z-10">{icon(active)}</span>
              <span
                className="relative z-10 font-semibold tracking-wide"
                style={{
                  fontSize: '10px',
                  color: active ? 'var(--et-blue)' : 'var(--et-placeholder)',
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
