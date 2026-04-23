'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, X } from 'lucide-react'

type Schedule = {
  id: number
  title: string
  date: string
  start_time: string | null
  end_time: string | null
  memo: string
}

export default function SchedulePage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', startTime: '', endTime: '', memo: '' })
  const [saving, setSaving] = useState(false)

  const todayStr = today.toISOString().slice(0, 10)

  useEffect(() => {
    fetch(`/api/schedules?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(setSchedules)
  }, [year, month])

  const prevMonth = () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) }

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()
  const weeks = ['日', '月', '火', '水', '木', '金', '土']

  const toDateStr = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const schedulesForDate = (date: string) => schedules.filter((s) => s.date === date)

  const handleDayClick = (day: number) => {
    setSelectedDate(toDateStr(day))
    setShowForm(false)
    setForm({ title: '', startTime: '', endTime: '', memo: '' })
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !selectedDate) return
    setSaving(true)
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        date: selectedDate,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        memo: form.memo,
      }),
    })
    if (res.ok) {
      const s = await res.json()
      setSchedules((prev) => [...prev, s].sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? '').localeCompare(b.start_time ?? '')))
      setForm({ title: '', startTime: '', endTime: '', memo: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
    setSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  const formatTime = (s: Schedule) => {
    if (!s.start_time) return null
    return s.end_time ? `${s.start_time}〜${s.end_time}` : s.start_time
  }

  const selectedSchedules = selectedDate ? schedulesForDate(selectedDate) : []

  const formatSelectedDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00')
    const dow = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()]
    return `${dt.getMonth() + 1}月${dt.getDate()}日（${dow}）`
  }

  // 直近の予定（今日以降）
  const upcoming = schedules.filter((s) => s.date >= todayStr).slice(0, 5)

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <div className="mb-6 bg-gradient-to-r from-sky-600 to-cyan-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-200 mb-1">Schedule</p>
        <h1 className="text-2xl font-bold">スケジュール</h1>
        <p className="text-sm text-sky-100 mt-0.5">日付をタップして予定を追加</p>
      </div>

      {/* カレンダー */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="w-9 h-9 rounded-full hover:bg-sky-50 text-sky-600 transition flex items-center justify-center">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-gray-800">{year}年 {month}月</h2>
          <button onClick={nextMonth} className="w-9 h-9 rounded-full hover:bg-sky-50 text-sky-600 transition flex items-center justify-center">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {weeks.map((w, i) => (
            <div key={w} className={`text-center text-xs font-bold py-1 ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-sky-500' : 'text-gray-400'}`}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = toDateStr(day)
            const dow = (firstDay + day - 1) % 7
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const hasSchedule = schedulesForDate(dateStr).length > 0
            const count = schedulesForDate(dateStr).length
            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all relative
                  ${isSelected ? 'bg-sky-500 text-white shadow-md' : isToday ? 'ring-2 ring-sky-400 text-sky-600' : ''}
                  ${!isSelected && dow === 0 ? 'text-rose-500' : ''}
                  ${!isSelected && dow === 6 ? 'text-sky-500' : ''}
                  ${!isSelected && !isToday && dow !== 0 && dow !== 6 ? 'text-gray-700' : ''}
                  ${!isSelected ? 'hover:bg-sky-50' : ''}
                `}
              >
                {day}
                {hasSchedule && (
                  <span className={`text-[9px] font-bold leading-none mt-0.5 ${isSelected ? 'text-sky-100' : 'text-sky-500'}`}>
                    {count > 1 ? `${count}件` : '●'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 選択日の予定 */}
      {selectedDate && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-sky-100 mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-sky-50 border-b border-sky-100">
            <h3 className="text-sm font-bold text-sky-700">{formatSelectedDate(selectedDate)}</h3>
            <button onClick={() => { setShowForm(true) }}
              className="flex items-center gap-1 text-xs font-semibold text-sky-600 bg-sky-100 hover:bg-sky-200 px-3 py-1.5 rounded-lg transition">
              <Plus size={13} />追加
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAdd} className="px-4 py-3 border-b border-gray-100 bg-sky-50/30 space-y-2">
              <input
                type="text"
                placeholder="予定のタイトル"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                autoFocus
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <div className="flex gap-2 items-center">
                <Clock size={13} className="text-gray-400 shrink-0" />
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="flex-1 text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400" />
                <span className="text-gray-400 text-xs">〜</span>
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="flex-1 text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400" />
              </div>
              <input
                type="text"
                placeholder="メモ（任意）"
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition">
                  キャンセル
                </button>
                <button type="submit" disabled={saving || !form.title.trim()}
                  className="flex-1 py-2 bg-sky-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
                  保存
                </button>
              </div>
            </form>
          )}

          {selectedSchedules.length === 0 && !showForm && (
            <p className="text-center text-gray-300 text-sm py-6">予定なし</p>
          )}

          <div className="divide-y divide-gray-50">
            {selectedSchedules.map((s) => (
              <div key={s.id} className="flex items-start gap-3 px-4 py-3">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                  {formatTime(s) && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock size={11} />{formatTime(s)}
                    </p>
                  )}
                  {s.memo && <p className="text-xs text-gray-400 mt-0.5">{s.memo}</p>}
                </div>
                <button onClick={() => handleDelete(s.id)} className="text-gray-200 hover:text-rose-400 transition p-1 shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 直近の予定 */}
      {!selectedDate && upcoming.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">直近の予定</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {upcoming.map((s) => {
              const dt = new Date(s.date + 'T00:00:00')
              const dow = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()]
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-sky-50/30 transition"
                  onClick={() => { setSelectedDate(s.date); const d = new Date(s.date + 'T00:00:00'); setYear(d.getFullYear()); setMonth(d.getMonth() + 1) }}>
                  <div className="text-center min-w-10">
                    <p className="text-xs text-gray-400">{dt.getMonth() + 1}/{dt.getDate()}</p>
                    <p className={`text-xs font-bold ${dt.getDay() === 0 ? 'text-rose-500' : dt.getDay() === 6 ? 'text-sky-500' : 'text-gray-500'}`}>（{dow}）</p>
                  </div>
                  <div className="w-px h-8 bg-gray-100" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.title}</p>
                    {formatTime(s) && <p className="text-xs text-gray-400">{formatTime(s)}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!selectedDate && upcoming.length === 0 && schedules.length === 0 && (
        <div className="text-center py-12 text-gray-300">
          <p className="text-sm font-medium">予定がありません</p>
          <p className="text-xs mt-1">カレンダーの日付をタップして追加</p>
        </div>
      )}
    </div>
  )
}
