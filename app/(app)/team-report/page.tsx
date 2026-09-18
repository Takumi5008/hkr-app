'use client'

import { useState, useEffect } from 'react'
import { calcHKR, getPastMonths, HKR_TARGET } from '@/lib/hkr'

type LeadTimeStat = { type: string; label: string; avgDays: number; count: number }
type LeadTimeData = { leadTimeByType: LeadTimeStat[]; leadTimeOverall: { avgDays: number; count: number } | null }
type User = { id: number; name: string; role: string }
type TeamRecord = { user: { id: number; name: string }; records: { cancel_count: number; activation_count: number }[] }

const leadTimeMonthOptions = getPastMonths(12).map(({ year, month, label }) => ({
  value: `${year}-${String(month).padStart(2, '0')}`,
  label: `${year}年${label}`,
}))

export default function ReportPage() {
  const [role, setRole] = useState('')
  const [roleLoaded, setRoleLoaded] = useState(false)
  const [members, setMembers] = useState<User[]>([])

  const [ltMonth, setLtMonth] = useState('all')
  const [ltUserId, setLtUserId] = useState('all')
  const [ltData, setLtData] = useState<LeadTimeData | null>(null)
  const [ltLoading, setLtLoading] = useState(true)

  const now = new Date()
  const [hkrMonth, setHkrMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [hkrData, setHkrData] = useState<TeamRecord[]>([])
  const [hkrLoading, setHkrLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { setRole(d.role ?? ''); setRoleLoaded(true) })
    fetch('/api/users').then(r => (r.ok ? r.json() : [])).then((users: User[]) => {
      setMembers(Array.isArray(users) ? users.filter(u => u.role !== 'viewer') : [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setLtLoading(true)
    const params = new URLSearchParams()
    if (ltMonth !== 'all') {
      const [y, m] = ltMonth.split('-')
      params.set('year', y)
      params.set('month', String(parseInt(m, 10)))
    }
    if (ltUserId !== 'all') params.set('userId', ltUserId)
    fetch(`/api/report/lead-time?${params.toString()}`)
      .then(r => r.json())
      .then(d => { setLtData(d); setLtLoading(false) })
      .catch(() => setLtLoading(false))
  }, [ltMonth, ltUserId])

  useEffect(() => {
    setHkrLoading(true)
    const [y, m] = hkrMonth.split('-')
    fetch(`/api/team?year=${y}&month=${parseInt(m, 10)}`)
      .then(r => (r.status === 403 ? [] : r.json()))
      .then((d: TeamRecord[]) => { setHkrData(Array.isArray(d) ? d : []); setHkrLoading(false) })
      .catch(() => setHkrLoading(false))
  }, [hkrMonth])

  if (!roleLoaded) return <div className="p-6 flex items-center justify-center min-h-screen"><p className="text-gray-400">読み込み中...</p></div>
  if (role === 'member') return <div className="p-6 text-center text-gray-400">閲覧権限がありません</div>

  const hkrStats = hkrData
    .map((t) => {
      const totalCancel = t.records.reduce((s, r) => s + (r.cancel_count ?? 0), 0)
      const totalActivation = t.records.reduce((s, r) => s + (r.activation_count ?? 0), 0)
      return { id: t.user.id, name: t.user.name, totalCancel, totalActivation, hkr: calcHKR(totalActivation, totalCancel) }
    })
    .filter((t) => t.totalCancel > 0 || t.totalActivation > 0)
    .sort((a, b) => (b.hkr ?? -1) - (a.hkr ?? -1))
  const hkrCancelTotal = hkrStats.reduce((s, t) => s + t.totalCancel, 0)
  const hkrActivationTotal = hkrStats.reduce((s, t) => s + t.totalActivation, 0)
  const hkrOverall = calcHKR(hkrActivationTotal, hkrCancelTotal)

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl px-6 py-5 text-white shadow-lg">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Weekly Report</p>
        <h1 className="text-2xl font-bold">チームレポート</h1>
        <p className="text-sm text-slate-400 mt-1">回線別リードタイム・HKR</p>
      </div>

      {/* 回線別リードタイム */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3">回線別リードタイム（獲得→開通）</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          <select
            value={ltMonth}
            onChange={(e) => setLtMonth(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-gray-50"
          >
            <option value="all">全期間</option>
            {leadTimeMonthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={ltUserId}
            onChange={(e) => setLtUserId(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-gray-50"
          >
            <option value="all">全員</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        {ltLoading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : !ltData || ltData.leadTimeOverall === null ? (
          <p className="text-sm text-gray-400">データがまだありません</p>
        ) : (
          <>
            <div className="mb-3">
              <span className="text-3xl font-bold text-gray-900">{ltData.leadTimeOverall.avgDays}</span>
              <span className="text-sm text-gray-400 ml-1">日（全体平均・{ltData.leadTimeOverall.count}件）</span>
            </div>
            <div className="space-y-2">
              {ltData.leadTimeByType.map((lt) => (
                <div key={lt.type} className="flex items-center justify-between text-sm border-t border-gray-50 pt-2 first:border-0 first:pt-0">
                  <span className="text-gray-600">{lt.label}</span>
                  <span className="text-gray-900 font-semibold">{lt.avgDays}日<span className="text-gray-400 font-normal ml-1">（{lt.count}件）</span></span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* HKR */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3">HKR（定着率）</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          <select
            value={hkrMonth}
            onChange={(e) => setHkrMonth(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-gray-50"
          >
            {leadTimeMonthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        {hkrLoading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : hkrStats.length === 0 ? (
          <p className="text-sm text-gray-400">データがまだありません</p>
        ) : (
          <>
            <div className="mb-3">
              <span className={`text-3xl font-bold ${hkrOverall === null ? 'text-gray-300' : hkrOverall >= HKR_TARGET ? 'text-green-600' : 'text-red-600'}`}>
                {hkrOverall !== null ? `${hkrOverall}%` : '-'}
              </span>
              <span className="text-sm text-gray-400 ml-1">
                チーム全体（{hkrActivationTotal}開通 / {hkrCancelTotal}解除）
              </span>
            </div>
            <div className="space-y-2">
              {hkrStats.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm border-t border-gray-50 pt-2 first:border-0 first:pt-0">
                  <span className="text-gray-600">{m.name}</span>
                  <span className="text-gray-900 font-semibold">
                    <span className={m.hkr === null ? 'text-gray-300' : m.hkr >= HKR_TARGET ? 'text-green-600' : 'text-red-500'}>
                      {m.hkr !== null ? `${m.hkr}%` : '-'}
                    </span>
                    <span className="text-gray-400 font-normal ml-1">（{m.totalActivation}開通 / {m.totalCancel}解除）</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
