import { BottomNav } from '@/components/ui/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <main className="flex-1 pb-20 max-w-sm mx-auto w-full">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
