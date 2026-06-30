'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm flex flex-col items-center text-center gap-8"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-[#3B82F6] flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-white text-2xl font-bold">ET</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111111]">
            EmployTeens
          </h1>
          <p className="text-[#6B7280] text-base leading-relaxed">
            Jobs that come to you.<br />
            No searching. Just matches.
          </p>
        </div>

        {/* Value props */}
        <div className="w-full flex flex-col gap-3">
          {[
            { icon: '🎯', text: 'AI matches jobs to your schedule' },
            { icon: '📍', text: 'NY & NJ only — always near you' },
            { icon: '⚡', text: 'Built for teens 14–19' },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm text-[#374151] font-medium">{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="w-full flex flex-col gap-3">
          <Link href="/signup">
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full h-14 bg-[#3B82F6] text-white rounded-2xl font-semibold text-base shadow-lg shadow-blue-200 hover:bg-blue-500 transition-colors"
            >
              Get Started — It&apos;s Free
            </motion.button>
          </Link>
          <Link href="/login">
            <button className="w-full h-14 bg-white text-[#111111] rounded-2xl font-medium text-base border border-gray-200 hover:bg-gray-50 transition-colors">
              I already have an account
            </button>
          </Link>
        </div>

        <p className="text-xs text-[#9CA3AF]">
          For teens 14–19 in New York & New Jersey
        </p>
      </motion.div>
    </main>
  )
}
