'use client'

import { useEffect, useState } from 'react'

interface Row { id: number; name: string; weekly: number }

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function WeeklyRankingCard() {
  const [rows, setRows] = useState<Row[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/challenge/weekly')
      .then((r) => r.json())
      .then((d) => { setRows(d.rows ?? []); setFrom(d.from ?? ''); setTo(d.to ?? ''); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded) return null
  if (rows.length === 0) return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
      <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-2">
        📅 今週の開通ランキング
        {from && to && <span className="text-xs font-normal text-gray-400">（{formatDate(from)}〜{formatDate(to)}）</span>}
      </h2>
      <p className="text-xs text-gray-400">今週はまだ記録がありません</p>
    </div>
  )

  const max = rows[0].weekly
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
      <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
        📅 今週の開通ランキング
        {from && to && <span className="text-xs font-normal text-gray-400">（{formatDate(from)}〜{formatDate(to)}）</span>}
      </h2>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={row.id} className="flex items-center gap-3">
            <span className="text-base w-6 text-center shrink-0">
              {i < 3 ? medals[i] : <span className="text-xs text-gray-400 font-bold">{i + 1}</span>}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-gray-800 truncate">{row.name}</span>
                <span className="text-sm font-bold text-emerald-600 shrink-0 ml-2">{row.weekly}件</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                  style={{ width: `${Math.round((row.weekly / max) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
