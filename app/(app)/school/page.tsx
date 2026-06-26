'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Check, BookOpen, ClipboardList, GraduationCap } from 'lucide-react'

type EventType = 'test' | 'assignment'

interface SchoolEvent {
  id: number
  type: EventType
  subject: string
  event_date: string
  done: number
  memo: string
  created_at: string
}

interface TimetableCell {
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

export default function SchoolPage() {
  const [tab, setTab] = useState<'events' | 'timetable'>('events')
  const [events, setEvents] = useState<SchoolEvent[]>([])
  const [timetable, setTimetable] = useState<TimetableCell[]>([])
  const [loading, setLoading] = useState(true)

  // 新規登録フォーム
  const [form, setForm] = useState({ type: 'test' as EventType, subject: '', event_date: '', memo: '' })
  const [saving, setSaving] = useState(false)

  // 時間割編集
  const [editCell, setEditCell] = useState<{ day: number; period: number } | null>(null)
  const [editSubject, setEditSubject] = useState('')

  const fetchEvents = useCallback(async () => {
    const res = await fetch('/api/school/events')
    if (res.ok) setEvents(await res.json())
  }, [])

  const fetchTimetable = useCallback(async () => {
    const res = await fetch('/api/school/timetable')
    if (res.ok) setTimetable(await res.json())
  }, [])

  useEffect(() => {
    Promise.all([fetchEvents(), fetchTimetable()]).finally(() => setLoading(false))
  }, [fetchEvents, fetchTimetable])

  const getSubject = (day: number, period: number) =>
    timetable.find((c) => c.day_of_week === day && c.period === period)?.subject ?? ''

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subject || !form.event_date) return
    setSaving(true)
    const res = await fetch('/api/school/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setEvents(await res.json())
      setForm({ type: 'test', subject: '', event_date: '', memo: '' })
    }
    setSaving(false)
  }

  async function handleToggleDone(event: SchoolEvent) {
    const res = await fetch(`/api/school/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: event.done ? 0 : 1 }),
    })
    if (res.ok) setEvents(await res.json())
  }

  async function handleDelete(id: number) {
    if (!confirm('削除しますか？')) return
    const res = await fetch(`/api/school/events/${id}`, { method: 'DELETE' })
    if (res.ok) setEvents(await res.json())
  }

  async function handleSaveCell() {
    if (!editCell) return
    const res = await fetch('/api/school/timetable', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_of_week: editCell.day, period: editCell.period, subject: editSubject }),
    })
    if (res.ok) setTimetable(await res.json())
    setEditCell(null)
  }

  const pending = events.filter((e) => !e.done)
  const done = events.filter((e) => e.done)

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">読み込み中...</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <GraduationCap size={22} className="text-violet-500" />
        <h1 className="text-xl font-bold text-gray-800">学校管理</h1>
      </div>

      {/* タブ */}
      <div className="flex gap-2">
        {([['events', 'テスト・課題', ClipboardList], ['timetable', '時間割', BookOpen]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-violet-600 text-white shadow-sm' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ===== テスト・課題タブ ===== */}
      {tab === 'events' && (
        <div className="space-y-4">
          {/* 登録フォーム */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">新規登録</p>
            <form onSubmit={handleAddEvent} className="space-y-3">
              <div className="flex gap-2">
                {(['test', 'assignment'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      form.type === t
                        ? t === 'test' ? 'bg-rose-500 text-white' : 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t === 'test' ? 'テスト' : '課題'}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="科目名"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <input
                type="date"
                value={form.event_date}
                onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <input
                type="text"
                placeholder="メモ（任意）"
                value={form.memo}
                onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <button
                type="submit"
                disabled={saving || !form.subject || !form.event_date}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              >
                <Plus size={15} />
                {saving ? '登録中...' : '登録'}
              </button>
            </form>
          </div>

          {/* 未完了 */}
          {pending.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">未完了 ({pending.length})</p>
              </div>
              <ul className="divide-y divide-gray-50">
                {pending.map((ev) => {
                  const days = daysUntil(ev.event_date)
                  const urgent = days >= 0 && days <= 7
                  return (
                    <li key={ev.id} className={`flex items-start gap-3 px-4 py-3 ${urgent ? 'bg-amber-50/60' : ''}`}>
                      <button
                        onClick={() => handleToggleDone(ev)}
                        className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-violet-500 flex-shrink-0 transition-colors"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            ev.type === 'test' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {ev.type === 'test' ? 'テスト' : '課題'}
                          </span>
                          <span className="text-sm font-medium text-gray-800 truncate">{ev.subject}</span>
                          {urgent && days === 0 && (
                            <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">今日</span>
                          )}
                          {urgent && days > 0 && (
                            <span className="text-[10px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded-full">あと{days}日</span>
                          )}
                          {days < 0 && (
                            <span className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded-full bg-gray-100">{Math.abs(days)}日前</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{ev.event_date}</span>
                          {ev.memo && <span className="text-xs text-gray-400 truncate">{ev.memo}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleDelete(ev.id)} className="text-gray-300 hover:text-red-400 transition-colors mt-0.5 flex-shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {pending.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">未完了のイベントはありません</div>
          )}

          {/* 完了済み */}
          {done.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden opacity-70">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-400">完了済み ({done.length})</p>
              </div>
              <ul className="divide-y divide-gray-50">
                {done.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-3 px-4 py-3">
                    <button
                      onClick={() => handleToggleDone(ev)}
                      className="mt-0.5 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0"
                    >
                      <Check size={11} className="text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          ev.type === 'test' ? 'bg-rose-100 text-rose-400' : 'bg-blue-100 text-blue-400'
                        }`}>
                          {ev.type === 'test' ? 'テスト' : '課題'}
                        </span>
                        <span className="text-sm text-gray-400 line-through truncate">{ev.subject}</span>
                      </div>
                      <span className="text-xs text-gray-400">{ev.event_date}</span>
                    </div>
                    <button onClick={() => handleDelete(ev.id)} className="text-gray-200 hover:text-red-300 transition-colors mt-0.5 flex-shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ===== 時間割タブ ===== */}
      {tab === 'timetable' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">セルをタップして科目を編集</p>
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr>
                  <th className="border border-gray-100 px-2 py-2 bg-gray-50 text-gray-400 font-medium w-10">限</th>
                  {DAYS.map((d) => (
                    <th key={d} className="border border-gray-100 px-2 py-2 bg-gray-50 text-gray-600 font-semibold text-center">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((p) => (
                  <tr key={p}>
                    <td className="border border-gray-100 px-2 py-3 text-center text-gray-400 bg-gray-50 font-medium">{p}</td>
                    {DAYS.map((_, di) => {
                      const day = di + 1
                      const subject = getSubject(day, p)
                      const isEditing = editCell?.day === day && editCell?.period === p
                      return (
                        <td
                          key={day}
                          className="border border-gray-100 px-1 py-1 text-center cursor-pointer hover:bg-violet-50 transition-colors min-w-[72px]"
                          onClick={() => {
                            if (!isEditing) {
                              setEditCell({ day, period: p })
                              setEditSubject(subject)
                            }
                          }}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              type="text"
                              value={editSubject}
                              onChange={(e) => setEditSubject(e.target.value)}
                              onBlur={handleSaveCell}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCell() }}
                              className="w-full text-center text-xs border border-violet-400 rounded px-1 py-1 focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className={subject ? 'text-gray-700 font-medium' : 'text-gray-200'}>
                              {subject || '—'}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
