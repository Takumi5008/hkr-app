'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { getPastMonths } from '@/lib/hkr'

type DashboardData = {
  year: number
  month: number
  usage: { targetCount: number; activeCount: number; usageRate: number | null; avgEntryRate: number | null; noInputCount: number; staleCount: number }
  cases: { constructionUnconfirmed: number; activationMissing: number; updateOverdue: number; reviewPending: number }
  monthly: {
    thisMonth: { cancel: number; activation: number; cancelled: number; openingRate: number | null }
    prevMonth: { cancel: number; activation: number; cancelled: number; openingRate: number | null }
    past3Avg: { cancel: number; activation: number }
    diffVsPrevMonth: { cancel: number; activation: number }
    diffVsPast3Avg: { cancel: number; activation: number }
  }
}

const monthOptions = getPastMonths(6).map(({ year, month, label }) => ({
  value: `${year}-${String(month).padStart(2, '0')}`,
  label: `${year}年${label}`,
}))
const now = new Date()
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

function DiffTag({ v }: { v: number }) {
  if (v > 0) return <span className="text-xs font-bold text-emerald-600">+{v}</span>
  if (v < 0) return <span className="text-xs font-bold text-rose-500">{v}</span>
  return <span className="text-xs font-bold text-gray-400">±0</span>
}

function Card({ label, value, unit, sub, href, accent }: { label: string; value: string | number; unit?: string; sub?: ReactNode; href?: string; accent?: string }) {
  const inner = (
    <div className="bg-white rounded-xl border border-gray-200 p-4 h-full">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? 'text-gray-900'}`}>{value}{unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
  return href ? <Link href={href} className="block hover:ring-2 hover:ring-indigo-200 rounded-xl transition">{inner}</Link> : inner
}

export default function AdminDashboardPage() {
  const [role, setRole] = useState('')
  const [roleLoaded, setRoleLoaded] = useState(false)
  const [monthFilter, setMonthFilter] = useState(defaultMonth)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { setRole(d.role ?? ''); setRoleLoaded(true) })
  }, [])

  useEffect(() => {
    setLoading(true)
    const [y, m] = monthFilter.split('-')
    fetch(`/api/admin/dashboard?year=${y}&month=${parseInt(m, 10)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [monthFilter])

  if (!roleLoaded) return <div className="p-6 flex items-center justify-center min-h-screen"><p className="text-gray-400">読み込み中...</p></div>
  if (role !== 'manager' && role !== 'admin') return <div className="p-6 text-center text-gray-400">このページはマネージャーのみ閲覧できます</div>

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-slate-800 to-indigo-700 rounded-2xl px-6 py-5 text-white shadow-lg">
        <p className="text-xs text-indigo-200 uppercase tracking-widest mb-1">Admin Dashboard</p>
        <h1 className="text-2xl font-bold">管理ダッシュボード</h1>
        <p className="text-sm text-indigo-200 mt-1">利用定着・案件確認・当月実績を一画面で確認</p>
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
          <div>
            <h2 className="text-sm font-bold text-gray-600 mb-2">利用定着</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card label="対象者数" value={data.usage.targetCount} unit="人" />
              <Card label="利用者数／利用率" value={data.usage.activeCount} unit="人" sub={data.usage.usageRate !== null ? `${data.usage.usageRate}%` : '-'} href="/admin/engagement" />
              <Card label="入力率（平均）" value={data.usage.avgEntryRate !== null ? `${data.usage.avgEntryRate}%` : '-'} accent={data.usage.avgEntryRate !== null && data.usage.avgEntryRate < 80 ? 'text-rose-600' : undefined} href="/admin/engagement" />
              <Card label="未入力者数／更新停滞" value={data.usage.noInputCount} unit="人" sub={`更新7日超: ${data.usage.staleCount}人`} href="/admin/engagement" accent={data.usage.noInputCount > 0 ? 'text-rose-600' : undefined} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-gray-600 mb-2">案件確認</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card label="工事日未確認案件数" value={data.cases.constructionUnconfirmed} unit="件" href="/admin/cases" accent={data.cases.constructionUnconfirmed > 0 ? 'text-rose-600' : undefined} />
              <Card label="開通結果未入力案件数" value={data.cases.activationMissing} unit="件" href="/admin/cases" accent={data.cases.activationMissing > 0 ? 'text-rose-600' : undefined} />
              <Card label="更新漏れ件数（更新期限超過）" value={data.cases.updateOverdue} unit="件" href="/admin/cases" accent={data.cases.updateOverdue > 0 ? 'text-rose-600' : undefined} />
              <Card label="他者確認待ち／確認漏れ件数" value={data.cases.reviewPending} unit="件" href="/admin/cases" accent={data.cases.reviewPending > 0 ? 'text-rose-600' : undefined} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-gray-600 mb-2">当月実績</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card label="当月解除数" value={data.monthly.thisMonth.cancel} unit="件" sub={<DiffTag v={data.monthly.diffVsPrevMonth.cancel} />} />
              <Card label="当月開通数" value={data.monthly.thisMonth.activation} unit="件" sub={<DiffTag v={data.monthly.diffVsPrevMonth.activation} />} />
              <Card label="当月開通率(HKR)" value={data.monthly.thisMonth.openingRate !== null ? `${data.monthly.thisMonth.openingRate}%` : '-'} />
              <Card label="当月キャンセル数" value={data.monthly.thisMonth.cancelled} unit="件" />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 mt-3 text-xs text-gray-500 space-y-1">
              <p>前月比：解除 <DiffTag v={data.monthly.diffVsPrevMonth.cancel} />件／開通 <DiffTag v={data.monthly.diffVsPrevMonth.activation} />件（前月：解除{data.monthly.prevMonth.cancel}件・開通{data.monthly.prevMonth.activation}件）</p>
              <p>過去3ヶ月平均比：解除 <DiffTag v={data.monthly.diffVsPast3Avg.cancel} />件／開通 <DiffTag v={data.monthly.diffVsPast3Avg.activation} />件（平均：解除{data.monthly.past3Avg.cancel}件・開通{data.monthly.past3Avg.activation}件）</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
