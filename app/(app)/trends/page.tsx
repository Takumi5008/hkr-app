'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { calcHKR, HKR_TARGET, getPastMonths } from '@/lib/hkr'

export default function TrendsPage() {
  const [tab, setTab] = useState<string>('合算')
  const [records, setRecords] = useState<any[]>([])
  const [products, setProducts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState<number | null>(null)
  const [myName, setMyName] = useState('')
  const [isManager, setIsManager] = useState(false)
  const [allUsers, setAllUsers] = useState<{ id: number; name: string }[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => {
      setMyId(d.userId)
      setMyName(d.name)
      setSelectedUserId(d.userId)
      if (d.role === 'manager' || d.role === 'viewer') {
        setIsManager(true)
        fetch('/api/users').then((r) => r.json()).then((users: { id: number; name: string; role: string }[]) => {
          setAllUsers(users.filter((u) => u.role !== 'viewer' && u.role !== 'shift_viewer'))
        })
      }
    })
    fetch('/api/products').then((r) => r.json()).then((prods: { name: string }[]) => {
      setProducts(prods.map((p) => p.name))
    })
  }, [])

  useEffect(() => {
    if (!selectedUserId) return
    setLoading(true)
    fetch(`/api/records?userId=${selectedUserId}`).then((r) => r.json()).then((recs) => {
      setRecords(recs)
      setLoading(false)
    })
  }, [selectedUserId])

  const selectedName = allUsers.find((u) => u.id === selectedUserId)?.name ?? myName

  const months = getPastMonths(12)
  const tabs = [...products, '合算']

  const chartData = months.map(({ year, month, label }) => {
    let hkr: number | null = null
    if (tab === '合算') {
      const c = products.reduce((sum, p) => sum + (records.find((r) => r.year === year && r.month === month && r.product === p)?.cancel_count ?? 0), 0)
      const a = products.reduce((sum, p) => sum + (records.find((r) => r.year === year && r.month === month && r.product === p)?.activation_count ?? 0), 0)
      hkr = calcHKR(a, c)
    } else {
      const r = records.find((r) => r.year === year && r.month === month && r.product === tab)
      hkr = r ? calcHKR(r.activation_count, r.cancel_count) : null
    }
    return { label, hkr }
  })

  const COMMISSION = 15000
  const fmt = (n: number) => `¥${n.toLocaleString()}`

  const hasData = chartData.some((d) => d.hkr !== null)

  const monthRows = months.map(({ year, month }) => {
    let cancel = 0, activation = 0, expected = 0
    if (tab === '合算') {
      cancel     = products.reduce((sum, p) => sum + (records.find((r) => r.year === year && r.month === month && r.product === p)?.cancel_count     ?? 0), 0)
      activation = products.reduce((sum, p) => sum + (records.find((r) => r.year === year && r.month === month && r.product === p)?.activation_count ?? 0), 0)
      expected   = products.reduce((sum, p) => sum + (records.find((r) => r.year === year && r.month === month && r.product === p)?.expected_opening  ?? 0), 0)
    } else {
      const r = records.find((r) => r.year === year && r.month === month && r.product === tab)
      cancel     = r?.cancel_count     ?? 0
      activation = r?.activation_count ?? 0
      expected   = r?.expected_opening  ?? 0
    }
    return { year, month, cancel, activation, expected, hkr: calcHKR(activation, cancel) }
  })

  const dataMonths = monthRows.filter((r) => r.cancel > 0)
  const totalCancel      = monthRows.reduce((s, r) => s + r.cancel, 0)
  const totalActivation  = monthRows.reduce((s, r) => s + r.activation, 0)
  const totalExpected    = monthRows.reduce((s, r) => s + r.expected, 0)
  const avgCancel        = dataMonths.length > 0 ? Math.round(dataMonths.reduce((s, r) => s + r.cancel, 0)     / dataMonths.length * 10) / 10 : null
  const avgActivation    = dataMonths.length > 0 ? Math.round(dataMonths.reduce((s, r) => s + r.activation, 0) / dataMonths.length * 10) / 10 : null
  const avgExpected      = dataMonths.length > 0 ? Math.round(dataMonths.reduce((s, r) => s + r.expected, 0)   / dataMonths.length * 10) / 10 : null
  const validHkrs = monthRows.filter((r) => r.hkr !== null).map((r) => r.hkr!)
  const avgHkr = validHkrs.length > 0 ? Math.round(validHkrs.reduce((a, b) => a + b, 0) / validHkrs.length * 10) / 10 : null


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-violet-600 to-indigo-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Trends</p>
        <h1 className="text-2xl font-bold">マイ推移</h1>
        <p className="text-sm text-violet-100 mt-0.5">
          {selectedName ? `${selectedName}さんの過去12ヶ月` : '過去12ヶ月のHKR推移'}
        </p>
      </div>

      {isManager && allUsers.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-gray-500 shrink-0">表示メンバー</span>
          <select
            value={selectedUserId ?? ''}
            onChange={(e) => setSelectedUserId(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
          >
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name}{u.id === myId ? '（自分）' : ''}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">読み込み中...</div>
        ) : !hasData ? (
          <div className="h-64 flex items-center justify-center text-gray-400">データがありません</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => v != null ? [`${v}%`, 'HKR'] : ['データなし', 'HKR']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }} />
              <ReferenceLine y={HKR_TARGET} stroke="#ef4444" strokeDasharray="6 3"
                label={{ value: `目標 ${HKR_TARGET}%`, position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }} />
              <Line type="monotone" dataKey="hkr" stroke="#3b82f6" strokeWidth={2.5} connectNulls={false}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  if (payload.hkr == null) return <g key={`${cx}-${cy}`} />
                  return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={5}
                    fill={payload.hkr >= HKR_TARGET ? '#22c55e' : '#ef4444'} stroke="#fff" strokeWidth={2} />
                }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {hasData && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500">月</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">HKR</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">解除</th>
                <th className="text-right px-4 py-3 font-medium text-indigo-500">見込み開通</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">開通</th>
                <th className="text-right px-4 py-3 font-medium text-indigo-500">見込み委託費</th>
                <th className="text-right px-4 py-3 font-medium text-emerald-600">委託費</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthRows.map(({ year, month, cancel, activation, expected, hkr }) => {
                const label = months.find((m) => m.year === year && m.month === month)?.label ?? ''
                return (
                  <tr key={`${year}-${month}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{year}年{label}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${hkr == null ? 'text-gray-300' : hkr >= HKR_TARGET ? 'text-green-600' : 'text-red-600'}`}>
                      {hkr != null ? `${hkr}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{cancel > 0 ? cancel : '-'}</td>
                    <td className="px-4 py-3 text-right text-indigo-500">{expected > 0 ? expected : '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{activation > 0 ? activation : '-'}</td>
                    <td className="px-4 py-3 text-right text-indigo-500">
                      {expected > 0 ? fmt(expected * COMMISSION) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {activation > 0 ? fmt(activation * COMMISSION) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hkr == null ? <span className="text-gray-300 text-xs">未入力</span>
                        : hkr >= HKR_TARGET ? <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">達成</span>
                        : <span className="text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">未達</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50 border-t-2 border-blue-200">
                <td className="px-4 py-3 text-sm font-semibold text-blue-700">月平均</td>
                <td className={`px-4 py-3 text-right text-sm font-bold ${avgHkr == null ? 'text-gray-300' : avgHkr >= HKR_TARGET ? 'text-green-600' : 'text-red-600'}`}>
                  {avgHkr != null ? `${avgHkr}%` : '-'}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">{avgCancel ?? '-'}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-indigo-500">{avgExpected ?? '-'}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">{avgActivation ?? '-'}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-indigo-500">
                  {avgExpected != null ? fmt(Math.round(avgExpected) * COMMISSION) : '-'}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">
                  {avgActivation != null ? fmt(Math.round(avgActivation) * COMMISSION) : '-'}
                </td>
                <td />
              </tr>
              <tr className="bg-emerald-50 border-t border-emerald-200">
                <td className="px-4 py-3 text-sm font-semibold text-emerald-700">12ヶ月合計</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-400">-</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">{totalCancel > 0 ? totalCancel : '-'}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-indigo-500">{totalExpected > 0 ? totalExpected : '-'}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">{totalActivation > 0 ? totalActivation : '-'}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-indigo-500">
                  {totalExpected > 0 ? fmt(totalExpected * COMMISSION) : '-'}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">
                  {totalActivation > 0 ? fmt(totalActivation * COMMISSION) : '-'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
