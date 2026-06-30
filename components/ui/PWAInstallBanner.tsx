'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }

    // Capture install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Only show banner if not already installed and not dismissed
      const dismissed = localStorage.getItem('pwa-banner-dismissed')
      if (!dismissed) {
        setTimeout(() => setShowBanner(true), 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setShowBanner(false)
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setShowBanner(false)
    localStorage.setItem('pwa-banner-dismissed', 'true')
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">ET</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[#111111]">Add to Home Screen</p>
            <p className="text-xs text-[#6B7280]">Faster access to your job feed</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleDismiss} className="text-xs text-[#9CA3AF]">Later</button>
            <button
              onClick={handleInstall}
              className="text-xs font-semibold text-[#3B82F6] bg-blue-50 px-3 py-1.5 rounded-lg"
            >
              Add
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
