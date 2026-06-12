'use client'

import { useEffect, useState } from 'react'

interface FollowItem {
  name: string
  typeLabel: string
  fieldLabel: string
  kind?: 'follow' | 'cancel'
  cancelReason?: string
}

export default function TodayFollowAlerts() {
  const [items, setItems] = useState<FollowItem[] | null>(null)

  useEffect(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const d = now.getDate()
    fetch(`/api/activation/today-follow?y=${y}&m=${m}&d=${d}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
  }, [])

  const followItems  = items?.filter((i) => i.kind !== 'cancel') ?? []
  const cancelItems  = items?.filter((i) => i.kind === 'cancel') ?? []

  return (
    <div className="mt-4 space-y-3">
      {/* 日程ベースのフォロー */}
      {(items === null || followItems.length > 0) && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
          <h2 className="text-sm font-bold text-amber-700 flex items-center gap-2 mb-3">
            🔔 本日のフォロー対応
          </h2>
          {items === null ? (
            <p className="text-xs text-amber-300 text-center py-2">読み込み中...</p>
          ) : followItems.length === 0 ? (
            <p className="text-xs text-amber-400 text-center py-2">本日の対応はありません</p>
          ) : (
            <div className="space-y-2">
              {followItems.map((item, i) => (
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
          )}
        </div>
      )}

      {/* 開通❌キャンセル案件 */}
      {cancelItems.length > 0 && (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
          <h2 className="text-sm font-bold text-red-700 flex items-center gap-2 mb-3">
            ❌ 開通キャンセル — フォロー対応 {cancelItems.length}件
          </h2>
          <div className="space-y-2">
            {cancelItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-red-100">
                <span className="text-base">❌</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded mr-1.5">
                    {item.typeLabel}
                  </span>
                  <span className="text-sm font-bold text-gray-800">{item.name}</span>
                  <span className="text-sm text-gray-600">さん</span>
                  {item.cancelReason && (
                    <span className="text-xs text-red-500 ml-2">（{item.cancelReason}）</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
