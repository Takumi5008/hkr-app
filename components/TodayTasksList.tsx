'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import Link from 'next/link'

export interface TodayTask {
  key: string
  label: string
  href: string
  done?: boolean  // undefined = manual (localStorage), boolean = auto-detected
}

export interface FollowAlert {
  name: string
  typeLabel: string
  fieldLabel: string
}

export default function TodayTasksList({
  items,
  followAlerts,
}: {
  items: TodayTask[]
  followAlerts: FollowAlert[]
}) {
  const today = new Date().toISOString().slice(0, 10)
  const storageKey = `today-done-${today}`
  const [manualDone, setManualDone] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setManualDone(new Set(JSON.parse(stored)))
    } catch {}
  }, [storageKey])

  const isManual = (item: TodayTask) => item.done === undefined
  const isDone = (item: TodayTask) => item.done !== undefined ? item.done : manualDone.has(item.key)

  const toggle = (item: TodayTask) => {
    if (!isManual(item)) return
    setManualDone(prev => {
      const next = new Set(prev)
      if (next.has(item.key)) next.delete(item.key)
      else next.add(item.key)
      try { localStorage.setItem(storageKey, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  const hasFollow = followAlerts.length > 0

  if (items.length === 0 && !hasFollow) {
    return (
      <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-emerald-50">
        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
        <span className="text-sm text-emerald-700 font-medium">本日のタスクはありません</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const done = isDone(item)
        const manual = isManual(item)
        return (
          <div
            key={item.key}
            onClick={() => toggle(item)}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors
              ${done ? 'bg-emerald-50' : 'bg-gray-50'}
              ${manual && !done ? 'cursor-pointer hover:bg-gray-100 active:bg-gray-200' : ''}
            `}
          >
            {done
              ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              : <Circle size={16} className="text-gray-300 shrink-0" />}
            <span className={`text-sm flex-1 ${done ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
              {item.label}
            </span>
            {!done && (
              <Link
                href={item.href}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-indigo-600 font-medium hover:underline shrink-0"
              >
                確認する →
              </Link>
            )}
          </div>
        )
      })}

      {hasFollow && (
        <div className="flex items-start gap-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
          <span className="text-base shrink-0 mt-0.5">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-700">本日のフォロー対応 {followAlerts.length}件</p>
            <div className="mt-1 space-y-0.5">
              {followAlerts.map((alert, i) => (
                <p key={i} className="text-xs text-amber-600">
                  {alert.typeLabel} — {alert.name}さん（{alert.fieldLabel}）
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
