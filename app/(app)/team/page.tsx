'use client'

import { useState, useEffect } from 'react'
import { calcHKR, formatMonth, HKR_TARGET } from '@/lib/hkr'
import { AlertTriangle, Trophy, TrendingDown } from 'lucide-react'

export default function TeamPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [teamData, setTeamData] = useState<any[]>([])
  const [products, setProducts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data: { name: string }[]) => setProducts(data.map((p) => p.name)))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/team?year=${year}&month=${month}`)
      .then((r) => {
        if (r.status === 403) return []
        return r.json()
      })
      .then((d) => { setTeamData(d); setLoading(false) })
  }, [year, month])

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })

  function getMemberSummary(records: any[]) {
    return products.map((product) => {
      const r = records.find((r: any) => r.product === product)
      const cancel = r?.cancel_count ?? 0
      const activation = r?.activation_count ?? 0
      return { product, cancel, activation, hkr: calcHKR(activation, cancel) }
    })
  }

  const COMMISSION = 15000
  const fmt = (n: number) => `¥${n.toLocaleString()}`

  const teamStats = teamData.map(({ user, records }) => {
    const summaries = getMemberSummary(records)
    const totalCancel = summaries.reduce((s, r) => s + r.cancel, 0)
    const totalActivation = summaries.reduce((s, r) => s + r.activation, 0)
    return { user, summaries, allHkr: calcHKR(totalActivation, totalCancel), totalActivation, totalCancel }
  })

  const validHkrs = teamStats.filter((d) => d.allHkr !== null).map((d) => d.allHkr!)
  const teamAvg = validHkrs.length > 0 ? Math.round(validHkrs.reduce((a, b) => a + b, 0) / validHkrs.length * 10) / 10 : null
  const colSpanTotal = products.length * 3 + 3

  const [rankTab, setRankTab] = useState<string>('合算')

  const getRankedByKey = (key: string) => {
    if (key === '合算') {
      return [...teamStats]
        .filter((d) => d.allHkr !== null)
        .sort((a, b) => b.allHkr! - a.allHkr!)
        .map((d) => {
          const totalCancel = d.summaries.reduce((s: number, r: any) => s + r.cancel, 0)
          const totalActivation = d.summaries.reduce((s: number, r: any) => s + r.activation, 0)
          return { user: d.user, hkr: d.allHkr!, activation: totalActivation, cancel: totalCancel }
        })
    }
    return [...teamStats]
      .map((d) => {
        const s = d.summaries.find((s: any) => s.product === key)
        return { user: d.user, hkr: (s && s.cancel > 0) ? s.hkr : null, activation: s?.activation ?? 0, cancel: s?.cancel ?? 0 }
      })
      .filter((d) => d.hkr !== null)
      .sort((a, b) => b.hkr! - a.hkr!)
      .map((d) => ({ user: d.user, hkr: d.hkr!, activation: d.activation, cancel: d.cancel }))
  }

  const ranked = getRankedByKey(rankTab)
  const top3 = ranked.slice(0, 3)
  const bottom3 = ranked.slice(-3).reverse().filter((d) => d.hkr < HKR_TARGET)

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-teal-600 to-emerald-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-200 mb-1">Team</p>
        <h1 className="text-2xl font-bold">チーム全体</h1>
        <p className="text-sm text-teal-100 mt-0.5">{formatMonth(year, month)}のHKR一覧</p>
      </div>

      <div className="flex items-center justify-end mb-4">
        <select
          value={`${year}-${month}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split('-').map(Number)
            setYear(y); setMonth(m)
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white shadow-sm"
        >
          {monthOptions.map(({ year: y, month: m }) => (
            <option key={`${y}-${m}`} value={`${y}-${m}`}>{formatMonth(y, m)}</option>
          ))}
        </select>
      </div>

      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">チーム平均HKR</p>
          <p className={`text-2xl font-bold ${teamAvg == null ? 'text-gray-300' : teamAvg >= HKR_TARGET ? 'text-green-600' : 'text-red-600'}`}>
            {teamAvg != null ? `${teamAvg}%` : '-'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">チーム合計開通数</p>
          <p className="text-2xl font-bold text-indigo-600">
            {teamStats.reduce((s, d) => s + d.totalActivation, 0)}件
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4">
          <p className="text-xs text-emerald-600 mb-1 font-medium">チーム合計委託費</p>
          <p className="text-2xl font-bold text-emerald-700">
            {fmt(teamStats.reduce((s, d) => s + d.totalActivation, 0) * COMMISSION)}
          </p>
          <p className="text-xs text-emerald-500 mt-0.5">開通数 × ¥{COMMISSION.toLocaleString()}</p>
        </div>
      </div>

      {/* ランキング */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-yellow-500" />
            <h2 className="text-sm font-semibold text-gray-700">ランキング</h2>
          </div>
          {/* タブ */}
          <div className="flex gap-1 flex-wrap mb-4">
            {['合算', ...products].map((tab) => (
              <button
                key={tab}
                onClick={() => setRankTab(tab)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  rankTab === tab
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {ranked.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">データがありません</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* トップ */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">🏆 上位</p>
                <div className="space-y-2">
                  {top3.map((d, i) => {
                    const medals = ['🥇', '🥈', '🥉']
                    const bgColors = ['bg-yellow-50 border-yellow-200', 'bg-gray-50 border-gray-200', 'bg-orange-50 border-orange-200']
                    return (
                      <div key={d.user.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${bgColors[i]}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{medals[i]}</span>
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                            {d.user.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{d.user.name}</span>
                        </div>
                        <div className="text-right">
                        <span className="text-sm font-bold text-green-600">{d.hkr}%</span>
                        <p className="text-xs text-gray-400">{d.activation}開通/{d.cancel}解除</p>
                        <p className="text-xs text-emerald-600 font-medium">{fmt(d.activation * COMMISSION)}</p>
                      </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* 要フォロー */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium flex items-center gap-1"><TrendingDown size={12} className="text-red-400" />要フォロー</p>
                {bottom3.length === 0 ? (
                  <p className="text-sm text-green-600 font-medium py-2">全員目標達成！🎉</p>
                ) : (
                  <div className="space-y-2">
                    {bottom3.map((d) => (
                      <div key={d.user.id} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-red-50 border-red-200">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={13} className="text-red-500 shrink-0" />
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center text-white text-xs font-semibold">
                            {d.user.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{d.user.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-red-600">{d.hkr}%</span>
                          <p className="text-xs text-gray-400">{d.activation}開通/{d.cancel}解除</p>
                          <p className="text-xs text-emerald-600 font-medium">{fmt(d.activation * COMMISSION)}</p>
                          <p className="text-xs text-red-400">目標まで-{Math.round((HKR_TARGET - d.hkr) * 10) / 10}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* スマホ: カード表示 / PC: テーブル表示 */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400">読み込み中...</div>
        ) : teamStats.map(({ user, summaries, allHkr, totalActivation }) => (
          <div key={user.id} className={`bg-white rounded-xl border p-4 ${allHkr !== null && allHkr < HKR_TARGET ? 'border-red-200' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">{user.name}</span>
                  {totalActivation > 0 && <p className="text-xs text-emerald-600 font-medium">{fmt(totalActivation * COMMISSION)}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${allHkr == null ? 'text-gray-300' : allHkr >= HKR_TARGET ? 'text-green-600' : 'text-red-600'}`}>
                  {allHkr != null ? `${allHkr}%` : '未入力'}
                </span>
                {allHkr != null && (
                  allHkr >= HKR_TARGET
                    ? <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">達成</span>
                    : <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full"><AlertTriangle size={10} />未達</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {summaries.map((s) => (
                <div key={s.product} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 mb-0.5">{s.product}</p>
                  <p className={`text-sm font-bold ${s.cancel === 0 ? 'text-gray-300' : s.hkr != null && s.hkr >= HKR_TARGET ? 'text-green-600' : 'text-red-600'}`}>
                    {s.cancel === 0 ? '未入力' : s.hkr != null ? `${s.hkr}%` : '-'}
                  </p>
                  {s.cancel > 0 && <p className="text-xs text-gray-400">{s.activation}開通/{s.cancel}解除</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* PC: テーブル表示 */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-500" rowSpan={2}>名前</th>
                {products.map((p) => (
                  <th key={p} colSpan={3} className="text-center px-2 py-2 font-medium text-gray-600 border-b border-gray-100 border-l border-gray-200">
                    {p}
                  </th>
                ))}
                <th className="text-center px-4 py-2 font-medium text-gray-500 border-b border-gray-100 border-l border-gray-200" rowSpan={2}>合算</th>
                <th className="text-center px-4 py-2 font-medium text-gray-500 border-b border-gray-100" rowSpan={2}>状態</th>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200">
                {products.map((p) => (
                  <>
                    <th key={`${p}-cancel`} className="text-center px-2 py-2 text-xs font-medium text-gray-400 border-l border-gray-200">解除</th>
                    <th key={`${p}-activation`} className="text-center px-2 py-2 text-xs font-medium text-gray-400">開通</th>
                    <th key={`${p}-hkr`} className="text-center px-2 py-2 text-xs font-medium text-gray-400">HKR</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={colSpanTotal} className="px-4 py-8 text-center text-gray-400">読み込み中...</td></tr>
              ) : teamStats.map(({ user, summaries, allHkr, totalActivation, totalCancel }) => (
                <tr key={user.id} className={`hover:bg-gray-50 ${allHkr !== null && allHkr < HKR_TARGET ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  {summaries.map((s) => (
                    <>
                      <td key={`${s.product}-cancel`} className="px-2 py-3 text-center text-sm border-l border-gray-100">
                        {s.cancel === 0 ? <span className="text-gray-300 text-xs">-</span>
                          : <span className="text-gray-700">{s.cancel}</span>}
                      </td>
                      <td key={`${s.product}-activation`} className="px-2 py-3 text-center text-sm">
                        {s.activation === 0 ? <span className="text-gray-300 text-xs">-</span>
                          : <span className="text-indigo-600 font-medium">{s.activation}</span>}
                      </td>
                      <td key={`${s.product}-hkr`} className="px-2 py-3 text-center">
                        {s.cancel === 0 ? <span className="text-gray-300 text-xs">-</span>
                          : <span className={`font-semibold text-sm ${s.hkr != null && s.hkr >= HKR_TARGET ? 'text-green-600' : 'text-red-600'}`}>
                              {s.hkr != null ? `${s.hkr}%` : '-'}
                            </span>}
                      </td>
                    </>
                  ))}
                  <td className="px-4 py-3 text-center">
                    {allHkr == null ? <span className="text-gray-300 text-xs">未入力</span>
                      : <div>
                          <span className={`font-bold ${allHkr >= HKR_TARGET ? 'text-green-600' : 'text-red-600'}`}>{allHkr}%</span>
                          <p className="text-xs text-gray-400">
                            {totalActivation}開通/{totalCancel}解除
                          </p>
                          <p className="text-xs text-emerald-600 font-medium">{fmt(totalActivation * COMMISSION)}</p>
                        </div>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {allHkr == null ? <span className="text-xs text-gray-300">-</span>
                      : allHkr >= HKR_TARGET
                        ? <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">達成</span>
                        : <span className="flex items-center justify-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                            <AlertTriangle size={11} />未達
                          </span>}
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
