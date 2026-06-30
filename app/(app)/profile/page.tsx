'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserProfile } from '@/lib/types/database'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) setProfile(data as unknown as UserProfile)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const skills = (profile?.skills ?? []) as string[]
  const interests = (profile?.interests ?? []) as string[]

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-[#111111]">Your Profile</h1>
        <p className="text-sm text-[#6B7280] mt-1">Your AI uses this to match jobs</p>
      </div>

      {loading ? (
        <div className="px-5 flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-4 pb-4">
          {/* Identity card */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#3B82F6] flex items-center justify-center shadow-md shadow-blue-100">
              <span className="text-white text-2xl font-bold">
                {profile?.name?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div>
              <p className="font-bold text-lg text-[#111111]">{profile?.name}</p>
              <p className="text-sm text-[#6B7280]">Age {profile?.age} · {profile?.state} {profile?.zip_code}</p>
            </div>
          </div>

          {/* Info cards */}
          {[
            { label: 'Transportation', value: profile?.transportation?.replace(/_/g, ' ') ?? 'Not set', emoji: '🚌' },
            { label: 'School Schedule', value: `${profile?.school_grade} grade · Out at ${profile?.school_end_time}`, emoji: '🏫' },
            { label: 'Experience', value: profile?.experience_required ?? 'None yet', emoji: '💼' },
          ].map(({ label, value, emoji }) => (
            <div key={label} className="bg-white rounded-2xl px-5 py-4 border border-gray-100 flex items-center gap-4">
              <span className="text-2xl">{emoji}</span>
              <div>
                <p className="text-xs text-[#9CA3AF] font-medium">{label}</p>
                <p className="text-sm font-semibold text-[#374151] capitalize">{value}</p>
              </div>
            </div>
          ))}

          {/* Interests */}
          {interests.length > 0 && (
            <div className="bg-white rounded-2xl px-5 py-4 border border-gray-100">
              <p className="text-xs text-[#9CA3AF] font-medium mb-3">Interests</p>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest: string) => (
                  <span key={interest} className="bg-blue-50 text-[#3B82F6] text-xs font-medium px-3 py-1.5 rounded-full">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="bg-white rounded-2xl px-5 py-4 border border-gray-100">
              <p className="text-xs text-[#9CA3AF] font-medium mb-3">Skills</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill: string) => (
                  <span key={skill} className="bg-gray-50 text-[#374151] text-xs font-medium px-3 py-1.5 rounded-full border border-gray-100">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resume */}
          {profile?.resume_url && (
            <a
              href={profile.resume_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-2xl px-5 py-4 border border-gray-100 flex items-center gap-3"
            >
              <span className="text-2xl">📄</span>
              <div>
                <p className="text-sm font-semibold text-[#374151]">Resume uploaded</p>
                <p className="text-xs text-[#3B82F6]">Tap to view</p>
              </div>
            </a>
          )}

          {/* Sign out */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSignOut}
            className="w-full h-12 rounded-2xl font-semibold text-sm text-red-500 bg-red-50 border border-red-100 mt-2"
          >
            Sign Out
          </motion.button>
        </div>
      )}
    </div>
  )
}
