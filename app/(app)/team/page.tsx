'use client'

import { useState, useEffect } from 'react'
import { calcHKR, formatMonth, HKR_TARGET } from '@/lib/hkr'
import { AlertTriangle } from 'lucide-react'

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

  const teamStats = teamData.map(({ user, records }) => {
    const summaries = getMemberSummary(records)
    const totalCancel = summaries.reduce((s, r) => s + r.cancel, 0)
    const totalActivation = summaries.reduce((s, r) => s + r.activation, 0)
    return { user, summaries, allHkr: calcHKR(totalActivation, totalCancel) }
  })

  const validHkrs = teamStats.filter((d) => d.allHkr !== null).map((d) => d.allHkr!)
  const teamAvg = validHkrs.length > 0 ? Math.round(validHkrs.reduce((a, b) => a + b, 0) / validHkrs.length * 10) / 10 : null
  const colSpanTotal = products.length + 3

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

      <div className="mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 w-fit">
          <p className="text-xs text-gray-500 mb-1">チーム平均（合算）</p>
          <p className={`text-3xl font-bold ${teamAvg == null ? 'text-gray-300' : teamAvg >= HKR_TARGET ? 'text-green-600' : 'text-red-600'}`}>
            {teamAvg != null ? `${teamAvg}%` : '-'}
          </p>
        </div>
      </div>

      {/* スマホ: カード表示 / PC: テーブル表示 */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400">読み込み中...</div>
        ) : teamStats.map(({ user, summaries, allHkr }) => (
          <div key={user.id} className={`bg-white rounded-xl border p-4 ${allHkr !== null && allHkr < HKR_TARGET ? 'border-red-200' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                  {user.name.charAt(0)}
                </div>
                <span className="font-semibold text-gray-900">{user.name}</span>
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
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500">名前</th>
                {products.map((p) => <th key={p} className="text-center px-4 py-3 font-medium text-gray-500">{p}</th>)}
                <th className="text-center px-4 py-3 font-medium text-gray-500">合算</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={colSpanTotal} className="px-4 py-8 text-center text-gray-400">読み込み中...</td></tr>
              ) : teamStats.map(({ user, summaries, allHkr }) => (
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
                    <td key={s.product} className="px-4 py-3 text-center">
                      {s.cancel === 0 ? <span className="text-gray-300 text-xs">未入力</span>
                        : <span className={`font-semibold ${s.hkr != null && s.hkr >= HKR_TARGET ? 'text-green-600' : 'text-red-600'}`}>
                            {s.hkr != null ? `${s.hkr}%` : '-'}
                          </span>}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    {allHkr == null ? <span className="text-gray-300 text-xs">未入力</span>
                      : <span className={`font-bold ${allHkr >= HKR_TARGET ? 'text-green-600' : 'text-red-600'}`}>{allHkr}%</span>}
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
