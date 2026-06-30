'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useOnboardingStore } from '@/lib/store/onboarding-store'

export function Step10Resume() {
  const { setResumeFile, nextStep } = useOnboardingStore()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setFile(f)
    setUploading(true)
    // Defer actual upload to profile save step
    setResumeFile(f)
    setTimeout(() => setUploading(false), 800)
  }

  return (
    <div className="w-full max-w-sm flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-[#6B7280] text-sm font-medium uppercase tracking-wider">Step 10 of 12</p>
        <h2 className="text-3xl font-bold text-[#111111] leading-tight">
          Got a resume?
        </h2>
        <p className="text-[#6B7280] text-sm">Optional — we can also help you build one from scratch.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {file ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-[#3B82F6] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
              <path d="M4 0C2.9 0 2 0.9 2 2V22C2 23.1 2.9 24 4 24H16C17.1 24 18 23.1 18 22V6L12 0H4Z" fill="white" fillOpacity="0.9" />
              <path d="M12 0L18 6H12V0Z" fill="white" fillOpacity="0.5" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#111111] truncate">{file.name}</p>
            <p className="text-xs text-[#6B7280]">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button onClick={() => { setFile(null); setResumeFile(null) }} className="text-[#9CA3AF] hover:text-[#6B7280]">✕</button>
        </motion.div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => inputRef.current?.click()}
          className="h-32 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-[#3B82F6] hover:bg-blue-50/30 transition-all"
        >
          <span className="text-3xl">📄</span>
          <span className="text-sm font-medium text-[#374151]">Tap to upload PDF or Word doc</span>
          <span className="text-xs text-[#9CA3AF]">PDF, DOC, DOCX</span>
        </motion.button>
      )}

      <div className="flex flex-col gap-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={nextStep}
          disabled={uploading}
          className="w-full h-14 bg-[#3B82F6] text-white rounded-2xl font-semibold text-base shadow-lg shadow-blue-200 disabled:opacity-60 transition-all"
        >
          {uploading ? 'Uploading…' : file ? 'Continue with resume' : 'Skip for now'}
        </motion.button>
      </div>
    </div>
  )
}
