'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { getPastMonths } from '@/lib/hkr'

type EngagementRow = {
  user_id: number
  name: string
  lastUpdatedAt: string | null
  entryRate: number | null
  enteredCount: number
  plannedCount: number
  missingCount: number
  alert: boolean
  alertReasons: string[]
}

type EngagementData = {
  year: number
  month: number
  members: EngagementRow[]
  summary: { targetCount: number; activeCount: number; usageRate: number | null; avgEntryRate: number | null; alertCount: number }
}

const monthOptions = getPastMonths(6).map(({ year, month, label }) => ({
  value: `${year}-${String(month).padStart(2, '0')}`,
  label: `${year}年${label}`,
}))
const now = new Date()
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

export default function AdminEngagementPage() {
  const [role, setRole] = useState('')
  const [roleLoaded, setRoleLoaded] = useState(false)
  const [monthFilter, setMonthFilter] = useState(defaultMonth)
  const [data, setData] = useState<EngagementData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { setRole(d.role ?? ''); setRoleLoaded(true) })
  }, [])

  useEffect(() => {
    setLoading(true)
    const [y, m] = monthFilter.split('-')
    fetch(`/api/admin/engagement?year=${y}&month=${parseInt(m, 10)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [monthFilter])

  if (!roleLoaded) return <div className="p-6 flex items-center justify-center min-h-screen"><p className="text-gray-400">読み込み中...</p></div>
  if (role === 'member') return <div className="p-6 text-center text-gray-400">このページはマネージャーのみ閲覧できます</div>

  const members = [...(data?.members ?? [])].sort((a, b) => Number(b.alert) - Number(a.alert))

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-indigo-600 to-blue-500 rounded-2xl px-6 py-5 text-white shadow-lg">
        <p className="text-xs text-indigo-100 uppercase tracking-widest mb-1">Engagement</p>
        <h1 className="text-2xl font-bold">利用定着</h1>
        <p className="text-sm text-indigo-100 mt-1">最終更新日・入力率・未入力件数を一覧で確認</p>
      </div>

      <select
        value={monthFilter}
        onChange={(e) => setMonthFilter(e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white"
      >
        {monthOptions.map((m) => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>

      {loading || !data ? (
        <p className="text-sm text-gray-400 text-center py-10">読み込み中...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">対象者数</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary.targetCount}<span className="text-sm font-normal text-gray-400 ml-1">人</span></p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">利用者数／利用率</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary.activeCount}<span className="text-sm font-normal text-gray-400 ml-1">人</span></p>
              <p className="text-xs text-gray-400">{data.summary.usageRate !== null ? `${data.summary.usageRate}%` : '-'}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">平均入力率</p>
              <p className={`text-2xl font-bold ${data.summary.avgEntryRate !== null && data.summary.avgEntryRate < 80 ? 'text-rose-600' : 'text-gray-900'}`}>
                {data.summary.avgEntryRate !== null ? `${data.summary.avgEntryRate}%` : '-'}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">アラート対象</p>
              <p className={`text-2xl font-bold ${data.summary.alertCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{data.summary.alertCount}<span className="text-sm font-normal text-gray-400 ml-1">人</span></p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-700">メンバー別利用状況</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {members.map((m) => (
                <div key={m.user_id} className={`flex items-center justify-between px-4 py-3 gap-3 ${m.alert ? 'bg-rose-50/40' : ''}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {m.alert ? <AlertTriangle size={15} className="text-rose-400 shrink-0" /> : <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                      {m.alert && <p className="text-xs text-rose-500">{m.alertReasons.join(' / ')}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-4">
                    <div>
                      <p className="text-xs text-gray-400">入力率</p>
                      <p className="text-sm font-bold text-gray-700">
                        {m.entryRate !== null ? `${m.entryRate}%` : 'シフト未提出'}
                      </p>
                      {m.entryRate !== null && (
                        <p className="text-xs text-gray-400">{m.enteredCount}/{m.plannedCount}日</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">最終更新</p>
                      <p className="text-sm font-medium text-gray-600">{m.lastUpdatedAt ? m.lastUpdatedAt.slice(0, 10) : '未更新'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
