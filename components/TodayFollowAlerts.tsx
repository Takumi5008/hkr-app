'use client'

import { useEffect, useState, useCallback } from 'react'

interface FollowItem { name: string; typeLabel: string; fieldLabel: string }

export default function TodayFollowAlerts() {
  const [items, setItems] = useState<FollowItem[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const d = now.getDate()
    fetch(`/api/activation/today-follow?y=${y}&m=${m}&d=${d}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setItems(data) })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => { load() }, [load])

  if (!loaded || items.length === 0) return null

  return (
    <div className="mt-4 bg-amber-50 rounded-2xl border border-amber-200 p-4">
      <h2 className="text-sm font-bold text-amber-700 flex items-center gap-2 mb-3">
        🔔 本日のフォロー対応
      </h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-amber-100">
            <span className="text-base">📋</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded mr-1.5">
                {item.typeLabel}
              </span>
              <span className="text-sm font-bold text-gray-800">{item.name}</span>
              <span className="text-sm text-gray-600"> さんの</span>
              <span className="text-sm font-bold text-amber-700">「{item.fieldLabel}」</span>
              <span className="text-sm text-gray-600">は本日です</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
