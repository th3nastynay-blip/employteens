import { BottomNav } from '@/components/ui/BottomNav'
import { ApplyConfirmSheet } from '@/components/jobs/ApplyConfirmSheet'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--et-surface-2)' }}>
      <main className="flex-1 pb-nav max-w-sm mx-auto w-full">
        {children}
      </main>
      <ApplyConfirmSheet />
      <BottomNav />
    </div>
  )
}
