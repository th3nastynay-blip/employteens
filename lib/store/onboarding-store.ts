import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OnboardingState, Transportation, SchoolGrade, ExperienceLevel, WeeklyAvailability } from '@/lib/types/onboarding'

interface OnboardingStore extends OnboardingState {
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setName: (name: string) => void
  setAge: (age: number) => void
  setState: (state: 'NY' | 'NJ') => void
  setZipCode: (zip: string) => void
  setTransportation: (t: Transportation) => void
  setSchoolGrade: (grade: SchoolGrade) => void
  setSchoolEndTime: (time: string) => void
  setAvailability: (availability: WeeklyAvailability) => void
  toggleInterest: (interest: string) => void
  toggleSkill: (skill: string) => void
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
  transportation: '',
  school_grade: '',
  school_end_time: '3:00 PM',
  availability: defaultAvailability,
  interests: [],
  skills: [],
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
      setTransportation: (transportation) => set({ transportation }),
      setSchoolGrade: (school_grade) => set({ school_grade }),
      setSchoolEndTime: (school_end_time) => set({ school_end_time }),
      setAvailability: (availability) => set({ availability }),
      toggleInterest: (interest) =>
        set((s) => ({
          interests: s.interests.includes(interest)
            ? s.interests.filter((i) => i !== interest)
            : [...s.interests, interest],
        })),
      toggleSkill: (skill) =>
        set((s) => ({
          skills: s.skills.includes(skill)
            ? s.skills.filter((sk) => sk !== skill)
            : [...s.skills, skill],
        })),
      setExperience: (experience) => set({ experience }),
      setResumeFile: (resume_file) => set({ resume_file }),
      setResumeUrl: (resume_url) => set({ resume_url }),
      reset: () => set(initialState),
    }),
    {
      name: 'employteens-onboarding',
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
        experience: state.experience,
        resume_url: state.resume_url,
      }),
    }
  )
)
