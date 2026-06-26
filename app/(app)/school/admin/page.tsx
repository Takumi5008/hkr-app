'use client'

import { useState, useEffect, useCallback } from 'react'
import { GraduationCap, AlertTriangle } from 'lucide-react'

interface AdminEvent {
  id: number
  user_id: number
  user_name: string
  type: 'test' | 'assignment'
  subject: string
  event_date: string
  memo: string
  created_at: string
}

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr)
  const t = new Date(todayStr)
  return Math.ceil((d.getTime() - t.getTime()) / 86400000)
}

export default function SchoolAdminPage() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterUser, setFilterUser] = useState('all')

  const fetchEvents = useCallback(async () => {
    const res = await fetch('/api/school/admin')
    if (res.status === 403) { setError('権限がありません'); setLoading(false); return }
    if (res.ok) setEvents(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const userNames = Array.from(new Set(events.map((e) => e.user_name))).sort()
  const filtered = filterUser === 'all' ? events : events.filter((e) => e.user_name === filterUser)

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">読み込み中...</div>
  if (error) return <div className="flex items-center justify-center h-screen text-red-400 text-sm">{error}</div>

  const urgent = filtered.filter((e) => { const d = daysUntil(e.event_date); return d >= 0 && d <= 7 })
  const other = filtered.filter((e) => { const d = daysUntil(e.event_date); return !(d >= 0 && d <= 7) })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <GraduationCap size={22} className="text-violet-500" />
        <h1 className="text-xl font-bold text-gray-800">学校管理（管理者）</h1>
      </div>

      {/* フィルター */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">メンバー:</span>
        {['all', ...userNames].map((u) => (
          <button
            key={u}
            onClick={() => setFilterUser(u)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filterUser === u ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {u === 'all' ? '全員' : u}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">未完了のイベントはありません</div>
      )}

      {/* 直近7日以内 */}
      {urgent.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-amber-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-100 bg-amber-50/60">
            <AlertTriangle size={15} className="text-amber-500" />
            <p className="text-sm font-semibold text-amber-700">直近7日以内 ({urgent.length}件)</p>
          </div>
          <EventList events={urgent} />
        </div>
      )}

      {/* その他 */}
      {other.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">今後の予定 ({other.length}件)</p>
          </div>
          <EventList events={other} />
        </div>
      )}
    </div>
  )
}

function EventList({ events }: { events: AdminEvent[] }) {
  return (
    <ul className="divide-y divide-gray-50">
      {events.map((ev) => {
        const days = daysUntil(ev.event_date)
        return (
          <li key={ev.id} className="flex items-start gap-3 px-4 py-3">
            <div className="flex-shrink-0 mt-0.5">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                ev.type === 'test' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {ev.type === 'test' ? 'テスト' : '課題'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-violet-700">{ev.user_name}</span>
                <span className="text-sm text-gray-800 truncate">{ev.subject}</span>
                {days === 0 && <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">今日</span>}
                {days > 0 && days <= 7 && <span className="text-[10px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded-full">あと{days}日</span>}
                {days < 0 && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{Math.abs(days)}日前</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">{ev.event_date}</span>
                {ev.memo && <span className="text-xs text-gray-400 truncate">{ev.memo}</span>}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
