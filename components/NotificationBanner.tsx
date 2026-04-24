'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'

type Item = { name: string; label: string }

export default function NotificationBanner() {
  const [items, setItems] = useState<Item[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const now = new Date()
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const y = jst.getUTCFullYear()
    const m = jst.getUTCMonth() + 1
    const d = jst.getUTCDate()
    const h = jst.getUTCHours()

    // 20時以降のみ表示
    if (h < 20) return

    // 今日すでに閉じていたら表示しない
    const key = `notif-dismissed-${y}-${m}-${d}`
    if (localStorage.getItem(key)) { setDismissed(true); return }

    fetch(`/api/activation/today-unchecked?y=${y}&m=${m}&d=${d}`)
      .then((r) => r.json())
      .then((data: Item[]) => { if (Array.isArray(data) && data.length > 0) setItems(data) })
      .catch(() => {})
  }, [])

  const dismiss = () => {
    const now = new Date()
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const key = `notif-dismissed-${jst.getUTCFullYear()}-${jst.getUTCMonth() + 1}-${jst.getUTCDate()}`
    localStorage.setItem(key, '1')
    setDismissed(true)
  }

  if (dismissed || items.length === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-3 shadow-lg sm:left-60">
      <div className="flex items-start gap-3 max-w-4xl mx-auto">
        <span className="text-xl shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">今日の未確認フォロー項目があります</p>
          <p className="text-xs text-amber-100 mt-0.5">
            {items.map((it, i) => (
              <span key={i}>{it.name}（{it.label}）{i < items.length - 1 ? '、' : ''}</span>
            ))}
          </p>
          <Link href="/activation" onClick={dismiss} className="text-xs underline text-amber-100 mt-1 inline-block">
            開通表を確認する →
          </Link>
        </div>
        <button onClick={dismiss} className="shrink-0 text-amber-100 hover:text-white transition">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
