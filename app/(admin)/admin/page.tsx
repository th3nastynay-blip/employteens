'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  total_jobs: number
  active_jobs: number
  flagged_jobs: number
  total_users: number
  total_applications: number
  jobs_by_source: { source: string; count: number }[]
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentIngestions, setRecentIngestions] = useState<any[]>([])

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient()

      const [
        { count: total_jobs },
        { count: active_jobs },
        { count: flagged_jobs },
        { count: total_users },
        { count: total_applications },
        { data: ingestions },
        { data: bySource },
      ] = await Promise.all([
        supabase.from('jobs').select('*', { count: 'exact', head: true }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'flagged'),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('ingestion_logs').select('*').order('started_at', { ascending: false }).limit(10),
        supabase.from('jobs').select('source').eq('status', 'active'),
      ])

      // Count by source
      const sourceCounts: Record<string, number> = {}
      for (const job of bySource ?? []) {
        sourceCounts[job.source] = (sourceCounts[job.source] ?? 0) + 1
      }
      const jobs_by_source = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)

      setStats({
        total_jobs: total_jobs ?? 0,
        active_jobs: active_jobs ?? 0,
        flagged_jobs: flagged_jobs ?? 0,
        total_users: total_users ?? 0,
        total_applications: total_applications ?? 0,
        jobs_by_source,
      })
      setRecentIngestions(ingestions ?? [])
      setLoading(false)
    }

    loadStats()
  }, [])

  async function triggerIngestion() {
    await fetch('/api/admin/trigger-ingest', { method: 'POST' })
    alert('Ingestion triggered — check logs in a few minutes')
  }

  async function triggerFeedGeneration() {
    const res = await fetch('/api/generate-feed', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? 'dev'}` },
    })
    const data = await res.json()
    alert(`Feed generated: ${data.matches_generated} matches for ${data.users_processed} users`)
  }

  const statCards = stats ? [
    { label: 'Active Jobs', value: stats.active_jobs, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Jobs', value: stats.total_jobs, color: 'text-[#3B82F6]', bg: 'bg-blue-50' },
    { label: 'Flagged Jobs', value: stats.flagged_jobs, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Total Users', value: stats.total_users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Applications', value: stats.total_applications, color: 'text-orange-600', bg: 'bg-orange-50' },
  ] : []

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#111111]">EmployTeens Admin</h1>
        <p className="text-[#6B7280] mt-1">System health and job moderation</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 mb-8">
            {statCards.map(({ label, value, color, bg }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-white rounded-2xl p-5 border border-gray-100"
              >
                <p className="text-xs text-[#9CA3AF] font-medium">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>{value.toLocaleString()}</p>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-8">
            <h2 className="font-bold text-[#111111] mb-4">Actions</h2>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={triggerIngestion}
                className="h-10 px-5 rounded-xl bg-[#3B82F6] text-white text-sm font-semibold"
              >
                🔄 Trigger Job Ingestion
              </button>
              <button
                onClick={triggerFeedGeneration}
                className="h-10 px-5 rounded-xl bg-green-500 text-white text-sm font-semibold"
              >
                🎯 Regenerate Feeds
              </button>
            </div>
          </div>

          {/* Jobs by source */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-8">
            <h2 className="font-bold text-[#111111] mb-4">Jobs by Source</h2>
            <div className="flex flex-col gap-2">
              {stats?.jobs_by_source.map(({ source, count }) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-sm text-[#374151]">{source}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3B82F6] rounded-full"
                        style={{ width: `${(count / (stats.active_jobs || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-[#111111] w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent ingestion logs */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100">
            <h2 className="font-bold text-[#111111] mb-4">Recent Ingestion Logs</h2>
            <div className="flex flex-col gap-3">
              {recentIngestions.map((log) => (
                <div key={log.id} className="flex flex-col gap-1 text-sm border-b border-gray-50 pb-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#374151]">{log.source}</span>
                    <span className="text-xs text-[#9CA3AF]">
                      {new Date(log.started_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-[#6B7280]">
                    <span>✅ {log.jobs_inserted} inserted</span>
                    <span>❌ {log.jobs_rejected} rejected</span>
                    <span>🔄 {log.jobs_deduplicated} duped</span>
                  </div>
                  {log.error_message && (
                    <p className="text-xs text-red-500">{log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
