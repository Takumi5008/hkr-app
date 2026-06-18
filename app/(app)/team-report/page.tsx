'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'

type MemberStat = {
  id: number; name: string
  thisMonthActivation: number; lastMonthActivation: number; thisMonthCancel: number; hkr: number | null
  monthGrowth: number
  thisWeekActivity: { pin: number; pingpong: number; intercom: number; face: number; wimax: number; sonet: number; total: number }
  lastWeekActivityTotal: number; weekGrowth: number
}

type ReportData = {
  period: { year: number; month: number; weekStart: string; weekEnd: string }
  team: { thisMonthTotal: number; lastMonthTotal: number; monthGrowth: number; thisWeekActivity: number; lastWeekActivity: number; weekGrowth: number; memberCount: number }
  members: MemberStat[]
  activationRanking: MemberStat[]
  activityRanking: MemberStat[]
  needsSupport: MemberStat[]
}

function GrowthTag({ v }: { v: number }) {
  if (v > 0) return <span className="inline-flex items-center gap-0.5 text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full"><TrendingUp size={10} />+{v}%</span>
  if (v < 0) return <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full"><TrendingDown size={10} />{v}%</span>
  return <span className="inline-flex items-center gap-0.5 text-xs font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full"><Minus size={10} />±0%</span>
}

export default function ReportPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setRole(d.role ?? ''))
    fetch('/api/report').then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 flex items-center justify-center min-h-screen"><p className="text-gray-400">読み込み中...</p></div>
  if (!data || role === 'member') return <div className="p-6 text-center text-gray-400">閲覧権限がありません</div>

  const { period, team, activationRanking, activityRanking, needsSupport, members } = data

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl px-6 py-5 text-white shadow-lg">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Weekly Report</p>
        <h1 className="text-2xl font-bold">チームレポート</h1>
        <p className="text-sm text-slate-400 mt-1">{period.year}年{period.month}月 / 今週: {period.weekStart}〜{period.weekEnd}</p>
      </div>

      {/* チームサマリー */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">今月チーム開通</p>
          <p className="text-4xl font-bold text-gray-900">{team.thisMonthTotal}<span className="text-base text-gray-400 ml-1">件</span></p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-400">先月: {team.lastMonthTotal}件</span>
            <GrowthTag v={team.monthGrowth} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 mb-1">今週チーム行動量</p>
          <p className="text-4xl font-bold text-gray-900">{team.thisWeekActivity}<span className="text-base text-gray-400 ml-1">件</span></p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-400">先週: {team.lastWeekActivity}件</span>
            <GrowthTag v={team.weekGrowth} />
          </div>
        </div>
      </div>

      {/* 要サポート */}
      {needsSupport.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
            <AlertCircle size={16} /> サポートが必要なメンバー
          </h2>
          <div className="space-y-2">
            {needsSupport.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-red-100">
                <span className="text-sm font-medium text-gray-800">{m.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">今月: <strong className="text-red-600">{m.thisMonthActivation}件</strong></span>
                  <GrowthTag v={m.monthGrowth} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 開通数ランキング */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">🏆 今月開通ランキング</h2>
        <div className="space-y-2">
          {activationRanking.map((m, i) => {
            const pct = activationRanking[0].thisMonthActivation > 0
              ? Math.round((m.thisMonthActivation / activationRanking[0].thisMonthActivation) * 100) : 0
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
            return (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-sm w-8 text-center">{medal}</span>
                <span className="text-sm font-medium text-gray-800 w-20 truncate">{m.name}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${i === 0 ? 'bg-yellow-400' : i < 3 ? 'bg-indigo-400' : 'bg-gray-300'}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-sm font-bold text-gray-900 w-8">{m.thisMonthActivation}件</span>
                  <GrowthTag v={m.monthGrowth} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 今週の行動量ランキング */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">⚡ 今週の行動量ランキング</h2>
        <div className="space-y-2">
          {activityRanking.map((m, i) => {
            const pct = activityRanking[0].thisWeekActivity.total > 0
              ? Math.round((m.thisWeekActivity.total / activityRanking[0].thisWeekActivity.total) * 100) : 0
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
            return (
              <div key={m.id} className="flex items-center gap-3">
                <span className="text-sm w-8 text-center">{medal}</span>
                <span className="text-sm font-medium text-gray-800 w-20 truncate">{m.name}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${i === 0 ? 'bg-yellow-400' : i < 3 ? 'bg-emerald-400' : 'bg-gray-300'}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-sm font-bold text-gray-900 w-8">{m.thisWeekActivity.total}件</span>
                  <GrowthTag v={m.weekGrowth} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 全メンバー詳細 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">👥 メンバー別詳細</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left py-2 font-medium pr-3">名前</th>
                <th className="text-right py-2 font-medium px-2">今月開通</th>
                <th className="text-right py-2 font-medium px-2">解除</th>
                <th className="text-right py-2 font-medium px-2">HKR</th>
                <th className="text-right py-2 font-medium px-2">今週行動</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="py-2.5 pr-3 font-medium text-gray-800">{m.name}</td>
                  <td className="text-right px-2">
                    <span className="font-bold text-indigo-600">{m.thisMonthActivation}</span>
                    <span className="text-xs text-gray-400 ml-1">件</span>
                  </td>
                  <td className="text-right px-2 text-gray-600">{m.thisMonthCancel}</td>
                  <td className="text-right px-2">
                    {m.hkr !== null
                      ? <span className={`font-bold ${m.hkr >= 80 ? 'text-green-600' : m.hkr >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>{m.hkr}%</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="text-right px-2">
                    <span className="text-gray-700">{m.thisWeekActivity.total}</span>
                    <span className="text-xs text-gray-400 ml-1">件</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
