import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  OnboardingState,
  Transportation,
  SchoolGrade,
  ExperienceLevel,
  WeeklyAvailability,
  WeightedInterest,
} from '@/lib/types/onboarding'

interface OnboardingStore extends OnboardingState {
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setName: (name: string) => void
  setAge: (age: number) => void
  setState: (state: 'NY' | 'NJ') => void
  setZipCode: (zip: string) => void
  // Multi-select: toggles a transportation mode on/off
  toggleTransportation: (t: Transportation) => void
  setTransportationList: (list: Transportation[]) => void
  setSchoolGrade: (grade: SchoolGrade) => void
  setSchoolEndTime: (time: string) => void
  setAvailability: (availability: WeeklyAvailability) => void
  // Weighted interests: toggles name, assigns weight from selection order
  toggleInterest: (name: string) => void
  setInterestWeight: (name: string, weight: 1 | 2 | 3) => void
  toggleSkill: (skill: string) => void
  toggleLanguage: (lang: string) => void
  setExperience: (exp: ExperienceLevel) => void
  setResumeFile: (file: File | null) => void
  setResumeUrl: (url: string | null) => void
  reset: () => void
}

const defaultAvailability: WeeklyAvailability = {
  monday: false,
  tuesday: false,
  wednesday: false,
  thursday: false,
  friday: false,
  saturday: false,
  sunday: false,
}

const initialState: OnboardingState = {
  step: 0,
  name: '',
  age: null,
  state: '',
  zip_code: '',
  transportation: [],          // multi-select array
  school_grade: '',
  school_end_time: '3:00 PM',
  availability: defaultAvailability,
  interests: [],               // WeightedInterest[]
  skills: [],
  languages: [],
  experience: '',
  resume_file: null,
  resume_url: null,
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ step }),
      nextStep: () => set((s) => ({ step: s.step + 1 })),
      prevStep: () => set((s) => ({ step: Math.max(0, s.step - 1) })),

      setName: (name) => set({ name }),
      setAge: (age) => set({ age }),
      setState: (state) => set({ state }),
      setZipCode: (zip_code) => set({ zip_code }),

      toggleTransportation: (t) =>
        set((s) => ({
          transportation: s.transportation.includes(t)
            ? s.transportation.filter((x) => x !== t)
            : [...s.transportation, t],
        })),

      setTransportationList: (list) => set({ transportation: list }),

      setSchoolGrade: (school_grade) => set({ school_grade }),
      setSchoolEndTime: (school_end_time) => set({ school_end_time }),
      setAvailability: (availability) => set({ availability }),

      toggleInterest: (name) =>
        set((s) => {
          const exists = s.interests.find((i) => i.name === name)
          if (exists) {
            return { interests: s.interests.filter((i) => i.name !== name) }
          }
          // Assign weight based on selection order: first = 3, second = 2, rest = 1
          const weight: 1 | 2 | 3 =
            s.interests.length === 0 ? 3 : s.interests.length === 1 ? 2 : 1
          return { interests: [...s.interests, { name, weight }] }
        }),

      setInterestWeight: (name, weight) =>
        set((s) => ({
          interests: s.interests.map((i) => (i.name === name ? { ...i, weight } : i)),
        })),

      toggleSkill: (skill) =>
        set((s) => ({
          skills: s.skills.includes(skill)
            ? s.skills.filter((sk) => sk !== skill)
            : [...s.skills, skill],
        })),

      toggleLanguage: (lang) =>
        set((s) => ({
          languages: s.languages.includes(lang)
            ? s.languages.filter((l) => l !== lang)
            : [...s.languages, lang],
        })),

      setExperience: (experience) => set({ experience }),
      setResumeFile: (resume_file) => set({ resume_file }),
      setResumeUrl: (resume_url) => set({ resume_url }),
      reset: () => set(initialState),
    }),
    {
      name: 'employteens-onboarding-v2',   // bump key to avoid stale state
      partialize: (state) => ({
        step: state.step,
        name: state.name,
        age: state.age,
        state: state.state,
        zip_code: state.zip_code,
        transportation: state.transportation,
        school_grade: state.school_grade,
        school_end_time: state.school_end_time,
        availability: state.availability,
        interests: state.interests,
        skills: state.skills,
        languages: state.languages,
        experience: state.experience,
        resume_url: state.resume_url,
      }),
    }
  )
)
