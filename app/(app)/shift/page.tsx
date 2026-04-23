'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { isHoliday } from '@/lib/holidays'

const CYCLE: Record<string, string | null> = { undefined: 'full', full: 'am', am: 'pm', pm: null }
const CELL_STYLE: Record<string, string> = {
  full: 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200',
  am:   'bg-gradient-to-b from-sky-400 to-sky-200 text-white shadow-sm shadow-sky-200',
  pm:   'bg-gradient-to-b from-amber-300 to-amber-500 text-white shadow-sm shadow-amber-200',
}
const LABEL: Record<string, string | null> = { full: null, am: '前', pm: '後' }

export default function ShiftPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [workMap, setWorkMap] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [deadlinePassed, setDeadlinePassed] = useState(false)
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/shifts/my?year=${year}&month=${month}`).then((r) => r.json()),
      fetch(`/api/deadlines?year=${year}&month=${month}`).then((r) => r.json()),
    ]).then(([shift, dl]) => {
      const map: Record<number, string> = {}
      if (Array.isArray(shift.workDates)) {
        shift.workDates.forEach((w: any) => {
          if (typeof w === 'number') map[w] = 'full'
          else map[w.day] = w.type
        })
      }
      setWorkMap(map)
      setSubmitted(shift.submitted)
      setDeadlineAt(dl.deadlineAt)
      setDeadlinePassed(dl.deadlineAt ? new Date(dl.deadlineAt) < new Date() : false)
    })
  }, [year, month])

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()
  const weeks = ['日', '月', '火', '水', '木', '金', '土']

  const cycleDate = (day: number) => {
    if (deadlinePassed) return
    setWorkMap((prev) => {
      const current = prev[day] as string | undefined
      const next = CYCLE[current ?? 'undefined']
      const updated = { ...prev }
      if (next) updated[day] = next
      else delete updated[day]
      return updated
    })
    setSubmitted(false)
    setMessage('')
  }

  const handleSave = async (isSubmit: boolean) => {
    setSaving(true)
    setMessage('')
    try {
      const workDates = Object.entries(workMap).map(([day, type]) => ({ day: parseInt(day), type }))
      const res = await fetch('/api/shifts/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, workDates, submitted: isSubmit }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setSubmitted(isSubmit)
      setMessage(isSubmit ? '提出しました！' : '保存しました')
    } catch (err: any) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const prevMonth = () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) }
  const totalDays = Object.keys(workMap).length

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <div className="mb-6 bg-gradient-to-r from-indigo-600 to-violet-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200 mb-1">Shift</p>
        <h1 className="text-2xl font-bold">シフト入力</h1>
        <p className="text-sm text-indigo-100 mt-0.5">勤務日をタップして選択してください</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="w-9 h-9 rounded-full hover:bg-indigo-50 text-indigo-600 font-bold transition flex items-center justify-center">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-gray-800">{year}年 {month}月</h2>
          <button onClick={nextMonth} className="w-9 h-9 rounded-full hover:bg-indigo-50 text-indigo-600 font-bold transition flex items-center justify-center">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
          <span>タップで切替:</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-gradient-to-br from-indigo-500 to-violet-500 inline-block" /> 全日</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-gradient-to-b from-sky-400 to-sky-200 inline-block" /> 前半</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-gradient-to-b from-amber-300 to-amber-500 inline-block" /> 後半</span>
        </div>

        {deadlinePassed && (
          <div className="mb-4 flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2.5 ring-1 ring-rose-200">
            提出期限が終了しています。変更はできません。
          </div>
        )}
        {deadlineAt && !deadlinePassed && (
          <div className="mb-4 text-xs text-gray-500 bg-amber-50 rounded-xl px-3 py-2 ring-1 ring-amber-100">
            締切: {new Date(deadlineAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weeks.map((w, i) => (
            <div key={w} className={`text-center text-xs font-bold py-1 ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-indigo-500' : 'text-gray-500'}`}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const type = workMap[day]
            const dow = (firstDay + day - 1) % 7
            const isToday = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()
            const holiday = isHoliday(year, month, day)
            const isRed = dow === 0 || holiday
            return (
              <button
                key={day}
                onClick={() => cycleDate(day)}
                disabled={deadlinePassed}
                className={`aspect-square rounded-xl text-sm font-semibold transition-all flex flex-col items-center justify-center leading-none
                  ${type ? CELL_STYLE[type] : deadlinePassed ? 'bg-gray-50 text-gray-400' : 'bg-gray-50 hover:bg-indigo-50 active:scale-95'}
                  ${!type && isRed ? 'text-rose-400' : ''}
                  ${!type && dow === 6 && !holiday ? 'text-indigo-400' : ''}
                  ${!type && !isRed && dow !== 6 ? 'text-gray-700' : ''}
                  ${isToday && !type ? 'ring-2 ring-indigo-400' : ''}
                  ${deadlinePassed ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span>{day}</span>
                {type && LABEL[type] && <span className="text-[9px] font-bold opacity-90 -mt-0.5">{LABEL[type]}</span>}
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex items-center justify-between text-sm">
          <span className="text-gray-500">出勤日：<span className="font-bold text-indigo-600">{totalDays}日</span></span>
          {submitted && (
            <span className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full text-xs">
              ✓ 提出済み
            </span>
          )}
        </div>

        {message && (
          <div className={`mt-3 text-sm rounded-xl px-4 py-2.5 ${
            message.includes('！') || message === '保存しました'
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
          }`}>{message}</div>
        )}

        {!deadlinePassed && (
          <div className="mt-4 flex gap-2">
            <button onClick={() => handleSave(false)} disabled={saving}
              className="flex-1 border-2 border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 transition">
              一時保存
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition shadow-md shadow-indigo-200">
              提出する
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
