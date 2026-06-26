'use client'

import { useState, useEffect, useCallback } from 'react'
import { GraduationCap, AlertTriangle, ClipboardList, BookOpen } from 'lucide-react'

interface AdminEvent {
  id: number
  user_id: number
  user_name: string
  type: 'test' | 'assignment'
  subject: string
  event_date: string
  memo: string
}

interface TimetableRow {
  user_id: number
  user_name: string
  day_of_week: number
  period: number
  subject: string
}

const DAYS = ['月', '火', '水', '木', '金', '土']
const PERIODS = [1, 2, 3, 4, 5, 6]

const today = new Date()
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr)
  const t = new Date(todayStr)
  return Math.ceil((d.getTime() - t.getTime()) / 86400000)
}

export default function SchoolAdminPage() {
  const [tab, setTab] = useState<'test' | 'assignment' | 'timetable'>('test')
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [timetable, setTimetable] = useState<TimetableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterUser, setFilterUser] = useState('all')

  const fetchAll = useCallback(async () => {
    const [evRes, ttRes] = await Promise.all([
      fetch('/api/school/admin'),
      fetch('/api/school/admin/timetable'),
    ])
    if (evRes.status === 403 || ttRes.status === 403) {
      setError('権限がありません')
      setLoading(false)
      return
    }
    if (evRes.ok) setEvents(await evRes.json())
    if (ttRes.ok) setTimetable(await ttRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // 全メンバー名（イベントまたは時間割に登録があるもの）
  const userNames = Array.from(new Set([
    ...events.map((e) => e.user_name),
    ...timetable.map((t) => t.user_name),
  ])).sort()

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">読み込み中...</div>
  if (error) return <div className="flex items-center justify-center h-screen text-red-400 text-sm">{error}</div>

  const filteredEvents = (type: 'test' | 'assignment') => {
    const base = events.filter((e) => e.type === type)
    return filterUser === 'all' ? base : base.filter((e) => e.user_name === filterUser)
  }

  // 時間割：メンバーごとにグループ化
  const ttUsers = filterUser === 'all'
    ? userNames.filter((u) => timetable.some((r) => r.user_name === u))
    : userNames.filter((u) => u === filterUser && timetable.some((r) => r.user_name === u))

  const getSubject = (userName: string, day: number, period: number) =>
    timetable.find((r) => r.user_name === userName && r.day_of_week === day && r.period === period)?.subject ?? ''

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <GraduationCap size={22} className="text-violet-500" />
        <h1 className="text-xl font-bold text-gray-800">学校管理（管理者）</h1>
      </div>

      {/* タブ */}
      <div className="flex gap-2 flex-wrap">
        {([
          ['test',       'テスト',   ClipboardList],
          ['assignment', '課題',     ClipboardList],
          ['timetable',  '時間割',   BookOpen],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-violet-600 text-white shadow-sm' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* メンバーフィルター */}
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

      {/* ===== テスト / 課題タブ ===== */}
      {(tab === 'test' || tab === 'assignment') && (() => {
        const evs = filteredEvents(tab)
        const urgent = evs.filter((e) => { const d = daysUntil(e.event_date); return d >= 0 && d <= 7 })
        const other  = evs.filter((e) => { const d = daysUntil(e.event_date); return !(d >= 0 && d <= 7) })

        if (evs.length === 0) return (
          <div className="text-center py-12 text-gray-400 text-sm">未完了の{tab === 'test' ? 'テスト' : '課題'}はありません</div>
        )
        return (
          <div className="space-y-4">
            {urgent.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-amber-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-100 bg-amber-50/60">
                  <AlertTriangle size={15} className="text-amber-500" />
                  <p className="text-sm font-semibold text-amber-700">直近7日以内 ({urgent.length}件)</p>
                </div>
                <EventList events={urgent} />
              </div>
            )}
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
      })()}

      {/* ===== 時間割タブ ===== */}
      {tab === 'timetable' && (
        <div className="space-y-6">
          {ttUsers.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">時間割が登録されていません</div>
          )}
          {ttUsers.map((userName) => (
            <div key={userName} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-violet-700">{userName}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse w-full">
                  <thead>
                    <tr>
                      <th className="border border-gray-100 px-2 py-2 bg-gray-50 text-gray-400 font-medium w-8">限</th>
                      {DAYS.map((d) => (
                        <th key={d} className="border border-gray-100 px-2 py-2 bg-gray-50 text-gray-600 font-semibold text-center">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((p) => (
                      <tr key={p}>
                        <td className="border border-gray-100 px-2 py-2.5 text-center text-gray-400 bg-gray-50 font-medium">{p}</td>
                        {DAYS.map((_, di) => {
                          const subject = getSubject(userName, di + 1, p)
                          return (
                            <td key={di} className="border border-gray-100 px-2 py-2.5 text-center min-w-[68px]">
                              <span className={subject ? 'text-gray-700 font-medium' : 'text-gray-200'}>
                                {subject || '—'}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
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
