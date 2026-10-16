'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import TableScrollContainer from '@/components/TableScrollContainer'
import { calcHKR, HKR_TARGET } from '@/lib/hkr'

type LineStat = { acquired: number; cancel: number; activation: number }
type MonthStats = { month: number; lines: Record<string, LineStat>; total: LineStat }
type StatsData = { year: number; lines: { key: string; label: string }[]; months: MonthStats[] }
type Metric = 'hkr' | 'cancelRate'

// 解除率 = 解除数 ÷ 獲得数 × 100（小数1桁）
const calcCancelRate = (cancel: number, acquired: number): number | null =>
  acquired === 0 ? null : Math.round((cancel / acquired) * 1000) / 10

const sumStats = (list: LineStat[]): LineStat => list.reduce(
  (acc, s) => ({ acquired: acc.acquired + s.acquired, cancel: acc.cancel + s.cancel, activation: acc.activation + s.activation }),
  { acquired: 0, cancel: 0, activation: 0 },
)

export default function ActivationStatsPage() {
  const [role, setRole] = useState('')
  const [roleLoaded, setRoleLoaded] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [metric, setMetric] = useState<Metric>('hkr')
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { setRole(d.role ?? ''); setRoleLoaded(true) })
  }, [])

  const changeYear = (delta: number) => { setLoading(true); setYear(y => y + delta) }

  useEffect(() => {
    fetch(`/api/admin/activation-stats?year=${year}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year])

  if (!roleLoaded) return <div className="p-6 flex items-center justify-center min-h-screen"><p className="text-gray-400">読み込み中...</p></div>
  if (role !== 'manager' && role !== 'admin' && role !== 'viewer') return <div className="p-6 text-center text-gray-400">このページはマネージャーのみ閲覧できます</div>

  const lines = data?.lines ?? []
  const months = (data?.months ?? []).filter(m => m.total.acquired > 0)
  const yearTotal: MonthStats | null = data && months.length > 0 ? {
    month: 0,
    lines: Object.fromEntries(lines.map(l => [l.key, sumStats(months.map(m => m.lines[l.key]))])),
    total: sumStats(months.map(m => m.total)),
  } : null

  const renderCell = (s: LineStat) => {
    const rate = metric === 'hkr' ? calcHKR(s.activation, s.cancel) : calcCancelRate(s.cancel, s.acquired)
    const sub = metric === 'hkr' ? `${s.activation}/${s.cancel}` : `${s.cancel}/${s.acquired}`
    const color = rate === null ? 'text-gray-300'
      : metric === 'hkr' ? (rate >= HKR_TARGET ? 'text-emerald-600' : 'text-rose-600')
      : 'text-gray-800'
    return (
      <div className="flex flex-col items-center leading-tight">
        <span className={`text-sm font-bold ${color}`}>{rate === null ? '-' : `${rate}%`}</span>
        <span className="text-[10px] text-gray-400">{sub}</span>
      </div>
    )
  }

  const renderRow = (m: MonthStats, label: string, isTotal = false) => (
    <tr key={label} className={isTotal ? 'bg-violet-50/50 font-semibold' : 'odd:bg-white even:bg-gray-50/30'}>
      <td className="border border-gray-100 px-3 py-2 text-center text-gray-600 whitespace-nowrap">{label}</td>
      {lines.map(l => (
        <td key={l.key} className="border border-gray-100 px-3 py-2 text-center">{renderCell(m.lines[l.key])}</td>
      ))}
      <td className="border border-gray-100 px-3 py-2 text-center bg-gray-50/60">{renderCell(m.total)}</td>
    </tr>
  )

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="bg-gradient-to-r from-violet-600 to-purple-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Line Stats</p>
        <h1 className="text-2xl font-bold">回線別HKR</h1>
        <p className="text-sm text-violet-100 mt-0.5">開通表（全メンバー）から月別・回線別の解除率とHKRを集計</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => changeYear(-1)} className="w-9 h-9 rounded-full bg-white shadow hover:bg-violet-50 text-violet-500 transition flex items-center justify-center">
            <ChevronLeft size={18} />
          </button>
          <span className="text-xl font-bold text-gray-800 min-w-20 text-center">{year}年</span>
          <button onClick={() => changeYear(1)} className="w-9 h-9 rounded-full bg-white shadow hover:bg-violet-50 text-violet-500 transition flex items-center justify-center">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['hkr', 'cancelRate'] as const).map(t => (
            <button key={t} onClick={() => setMetric(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${metric === t ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'hkr' ? 'HKR' : '解除率'}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {metric === 'hkr'
          ? `HKR = 開通⭕ ÷ 解除⭕ × 100（下段：開通/解除）。目標 ${HKR_TARGET}% 以上は緑、未満は赤。`
          : '解除率 = 解除⭕ ÷ 獲得数（開通表の件数） × 100（下段：解除/獲得）。'}
        {' '}月は開通表の登録月です。
      </p>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-10">読み込み中...</p>
      ) : !data || months.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">{year}年のデータがありません</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <TableScrollContainer>
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr>
                  <th className="border border-gray-100 px-3 py-2.5 bg-gray-50 text-gray-600 font-semibold">月</th>
                  {lines.map(l => (
                    <th key={l.key} className="border border-gray-100 px-3 py-2.5 bg-gray-50 text-gray-600 font-semibold whitespace-nowrap">{l.label}</th>
                  ))}
                  <th className="border border-gray-100 px-3 py-2.5 bg-gray-100 text-gray-700 font-semibold">全体</th>
                </tr>
              </thead>
              <tbody>
                {months.map(m => renderRow(m, `${m.month}月`))}
                {yearTotal && renderRow(yearTotal, '年間', true)}
              </tbody>
            </table>
          </TableScrollContainer>
        </div>
      )}
    </div>
  )
}
