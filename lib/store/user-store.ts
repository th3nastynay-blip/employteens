import { create } from 'zustand'
import type { UserProfile, JobMatch } from '@/lib/types/database'

interface UserStore {
  profile: UserProfile | null
  jobFeed: JobMatch[]
  savedJobs: string[]
  isLoading: boolean
  feedSection: 'best_matches' | 'new_near_you' | 'high_probability'
  setProfile: (profile: UserProfile) => void
  setJobFeed: (jobs: JobMatch[]) => void
  saveJob: (jobId: string) => void
  unsaveJob: (jobId: string) => void
  setLoading: (loading: boolean) => void
  setFeedSection: (section: UserStore['feedSection']) => void
}

export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  jobFeed: [],
  savedJobs: [],
  isLoading: false,
  feedSection: 'best_matches',
  setProfile: (profile) => set({ profile }),
  setJobFeed: (jobFeed) => set({ jobFeed }),
  saveJob: (jobId) => set((s) => ({ savedJobs: [...new Set([...s.savedJobs, jobId])] })),
  unsaveJob: (jobId) => set((s) => ({ savedJobs: s.savedJobs.filter((id) => id !== jobId) })),
  setLoading: (isLoading) => set({ isLoading }),
  setFeedSection: (feedSection) => set({ feedSection }),
}))
