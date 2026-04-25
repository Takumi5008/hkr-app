'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'

type ActivationItem = { name: string; label: string }
type ReminderItem = { type: 'shift' | 'mtg'; minutesLeft: number; label: string }

export default function NotificationBanner() {
  const [activationItems, setActivationItems] = useState<ActivationItem[]>([])
  const [reminderItems, setReminderItems] = useState<ReminderItem[]>([])
  const [activationDismissed, setActivationDismissed] = useState(false)
  const [reminderDismissed, setReminderDismissed] = useState(false)

  useEffect(() => {
    const now = new Date()
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const y = jst.getUTCFullYear()
    const m = jst.getUTCMonth() + 1
    const d = jst.getUTCDate()
    const h = jst.getUTCHours()

    // 開通表：20時以降のみ
    if (h >= 20) {
      fetch(`/api/activation/today-unchecked?y=${y}&m=${m}&d=${d}`)
        .then((r) => r.json())
        .then((data: ActivationItem[]) => { if (Array.isArray(data) && data.length > 0) setActivationItems(data) })
        .catch(() => {})
    }

    // シフト・MTG締切：常時チェック
    fetch('/api/reminders/upcoming')
      .then((r) => r.json())
      .then((data: ReminderItem[]) => { if (Array.isArray(data) && data.length > 0) setReminderItems(data) })
      .catch(() => {})
  }, [])

  return (
    <>
      {/* シフト・MTG締切バナー */}
      {!reminderDismissed && reminderItems.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-rose-500 text-white px-4 py-3 shadow-lg sm:left-60">
          <div className="flex items-start gap-3 max-w-4xl mx-auto">
            <span className="text-xl shrink-0">⏰</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">提出締切が近づいています</p>
              <div className="text-xs text-rose-100 mt-0.5 space-y-0.5">
                {reminderItems.map((it, i) => (
                  <p key={i}>{it.label}</p>
                ))}
              </div>
              <div className="flex gap-3 mt-1">
                {reminderItems.some((r) => r.type === 'shift') && (
                  <Link href="/shift" onClick={() => setReminderDismissed(true)} className="text-xs underline text-rose-100">
                    シフト入力 →
                  </Link>
                )}
                {reminderItems.some((r) => r.type === 'mtg') && (
                  <Link href="/mtg" onClick={() => setReminderDismissed(true)} className="text-xs underline text-rose-100">
                    MTG出欠 →
                  </Link>
                )}
              </div>
            </div>
            <button onClick={() => setReminderDismissed(true)} className="shrink-0 text-rose-100 hover:text-white transition">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 開通表未確認バナー */}
      {!activationDismissed && activationItems.length > 0 && (
        <div className={`fixed left-0 right-0 z-49 bg-amber-500 text-white px-4 py-3 shadow-lg sm:left-60 ${!reminderDismissed && reminderItems.length > 0 ? 'top-14' : 'top-0'}`}>
          <div className="flex items-start gap-3 max-w-4xl mx-auto">
            <span className="text-xl shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">今日の未確認フォロー項目があります</p>
              <p className="text-xs text-amber-100 mt-0.5">
                {activationItems.map((it, i) => (
                  <span key={i}>{it.name}（{it.label}）{i < activationItems.length - 1 ? '、' : ''}</span>
                ))}
              </p>
              <Link href="/activation" onClick={() => setActivationDismissed(true)} className="text-xs underline text-amber-100 mt-1 inline-block">
                開通表を確認する →
              </Link>
            </div>
            <button onClick={() => setActivationDismissed(true)} className="shrink-0 text-amber-100 hover:text-white transition">
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
