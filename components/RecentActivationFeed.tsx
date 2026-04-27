'use client'

import { useEffect, useState, useCallback } from 'react'

interface Row { name: string; activation: number; last_updated: string }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso.replace('Z', '+00:00')).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'たった今'
  if (m < 60) return `${m}分前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}時間前`
  return `${Math.floor(h / 24)}日前`
}

export default function RecentActivationFeed() {
  const [rows, setRows] = useState<Row[]>([])
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const load = useCallback(() => {
    fetch('/api/challenge/recent')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setRows(d); setLastFetch(new Date()) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60000) // poll every minute
    return () => clearInterval(t)
  }, [load])

  if (rows.length === 0) return null

  return (
    <div className="mt-6 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-indigo-700 flex items-center gap-2">
          ⚡ 本日の開通速報
        </h2>
        <button
          onClick={load}
          className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors"
        >
          更新
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 shadow-sm border border-indigo-50">
            <span className="text-lg">🎯</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-gray-800">{row.name}</span>
              <span className="text-sm text-gray-600"> が </span>
              <span className="text-sm font-black text-indigo-600">{row.activation}件</span>
              <span className="text-sm text-gray-600"> 開通しました！</span>
            </div>
            <span className="text-xs text-gray-400 shrink-0">{timeAgo(row.last_updated)}</span>
          </div>
        ))}
      </div>
      {lastFetch && (
        <p className="text-[10px] text-indigo-300 mt-2 text-right">
          {lastFetch.getHours()}:{String(lastFetch.getMinutes()).padStart(2, '0')} 更新
        </p>
      )}
    </div>
  )
}
