'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'
import { GRADE_LABELS, type SchoolGrade } from '@/lib/types/onboarding'

const GRADES: SchoolGrade[] = ['8th', '9th', '10th', '11th', '12th', 'graduated']
const END_TIMES = ['2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM']

export function Step05School() {
  const { school_grade, school_end_time, setSchoolGrade, setSchoolEndTime, nextStep } = useOnboardingStore()
  const [selectedGrade, setSelectedGrade] = useState<SchoolGrade | ''>(school_grade)
  const [selectedTime, setSelectedTime] = useState(school_end_time)

  function handleContinue() {
    if (!selectedGrade) return
    setSchoolGrade(selectedGrade as SchoolGrade)
    setSchoolEndTime(selectedTime)
    nextStep()
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-[#6B7280] text-sm font-medium uppercase tracking-wider">Step 5 of 12</p>
        <h2 className="text-3xl font-bold text-[#111111] leading-tight">
          Tell us about school
        </h2>
        <p className="text-[#6B7280] text-sm">We match jobs to your after-school hours.</p>
      </div>

      {/* Grade */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[#374151]">Current grade</label>
        <div className="grid grid-cols-2 gap-2">
          {GRADES.map((g, i) => (
            <motion.button
              key={g}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setSelectedGrade(g)}
              className={`h-12 rounded-xl text-sm font-semibold transition-all ${
                selectedGrade === g
                  ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-100'
                  : 'bg-white text-[#374151] border border-gray-100'
              }`}
            >
              {GRADE_LABELS[g]}
            </motion.button>
          ))}
        </div>
      </div>

      {/* School end time */}
      {selectedGrade && selectedGrade !== 'graduated' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2"
        >
          <label className="text-sm font-medium text-[#374151]">School ends at</label>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {END_TIMES.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className={`flex-shrink-0 h-10 px-4 rounded-xl text-sm font-medium transition-all ${
                  selectedTime === t
                    ? 'bg-[#3B82F6] text-white'
                    : 'bg-white text-[#374151] border border-gray-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleContinue}
        disabled={!selectedGrade}
        className="w-full h-14 bg-[#3B82F6] text-white rounded-2xl font-semibold text-base shadow-lg shadow-blue-200 disabled:opacity-40 disabled:shadow-none transition-all"
      >
        Continue
      </motion.button>
    </div>
  )
}
