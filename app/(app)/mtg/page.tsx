'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'

export default function MtgPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [fridays, setFridays] = useState<string[]>([])
  const [attendance, setAttendance] = useState<Record<string, any>>({})
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null)
  const [deadlinePassed, setDeadlinePassed] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/mtg/fridays?year=${year}&month=${month}`).then((r) => r.json()),
      fetch('/api/mtg/my').then((r) => r.json()),
      fetch(`/api/mtg/deadlines?year=${year}&month=${month}`).then((r) => r.json()),
    ]).then(([dates, map, dl]) => {
      setFridays(dates)
      setAttendance(map)
      setDeadlineAt(dl.deadlineAt)
      setDeadlinePassed(dl.deadlineAt ? new Date(dl.deadlineAt) < new Date() : false)
    })
  }, [year, month])

  const todayStr = today.toISOString().slice(0, 10)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
  }

  const prevMonth = () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) }

  const handleStatus = async (date: string, status: string) => {
    if (deadlinePassed || date < todayStr) return
    setSaving(date)
    setMessage('')
    const current = attendance[date] || {}
    try {
      const res = await fetch('/api/mtg/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, status, reason: current.reason || '', lateTime: current.late_time || '' }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setAttendance((prev) => ({ ...prev, [date]: { ...current, date, status } }))
      setMessage('保存しました')
      setTimeout(() => setMessage(''), 2000)
    } catch (err: any) {
      setMessage(err.message)
    } finally {
      setSaving(null)
    }
  }

  const handleField = (date: string, field: string, value: string) => {
    setAttendance((prev) => ({ ...prev, [date]: { ...(prev[date] || {}), [field]: value } }))
  }

  const handleFieldBlur = async (date: string, field: string, value: string) => {
    const current = attendance[date]
    if (!current || current.status === 'present') return
    if (deadlinePassed || date < todayStr) return
    setSaving(date)
    try {
      const reason = field === 'reason' ? value : current.reason || ''
      const lateTime = field === 'late_time' ? value : current.late_time || ''
      await fetch('/api/mtg/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, status: current.status, reason, lateTime }),
      })
      setMessage('保存しました')
      setTimeout(() => setMessage(''), 2000)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <div className="mb-6 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200 mb-1">MTG</p>
        <h1 className="text-2xl font-bold">MTG出欠</h1>
        <p className="text-sm text-emerald-100 mt-0.5">毎週金曜日の出欠を入力してください</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6">
        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="w-9 h-9 rounded-full hover:bg-emerald-50 text-emerald-600 font-bold transition flex items-center justify-center">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-gray-800">{year}年 {month}月</h2>
          <button onClick={nextMonth} className="w-9 h-9 rounded-full hover:bg-emerald-50 text-emerald-600 font-bold transition flex items-center justify-center">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 締切表示 */}
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

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Users size={16} className="text-emerald-600" />
          </div>
          <h3 className="text-base font-bold text-gray-800">金曜MTG出欠</h3>
        </div>

        {message && (
          <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2.5 ring-1 ring-emerald-200">{message}</div>
        )}

        {fridays.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">この月に金曜日はありません</p>
        )}

        <div className="space-y-2">
          {fridays.map((date) => {
            const rec = attendance[date] || {}
            const isPast = date < todayStr
            const locked = isPast || deadlinePassed
            return (
              <div key={date} className={`rounded-xl ring-1 overflow-hidden ${locked ? 'ring-gray-100 opacity-75' : 'ring-indigo-100'}`}>
                <div className={`flex items-center justify-between px-4 py-2.5 ${locked ? 'bg-gray-50' : 'bg-indigo-50/50'}`}>
                  <div>
                    <span className={`text-sm font-bold ${locked ? 'text-gray-500' : 'text-gray-800'}`}>
                      {formatDate(date)}
                      {date === todayStr && <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">今週</span>}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      { status: 'present', label: '✓ 出席', active: 'bg-emerald-500 text-white shadow-sm', hover: 'hover:border-emerald-400 hover:text-emerald-600' },
                      { status: 'late',    label: '⏰ 遅れる', active: 'bg-amber-400 text-white shadow-sm', hover: 'hover:border-amber-400 hover:text-amber-600' },
                      { status: 'absent',  label: '✗ 欠席', active: 'bg-rose-500 text-white shadow-sm', hover: 'hover:border-rose-400 hover:text-rose-600' },
                    ].map(({ status, label, active, hover }) => (
                      <button
                        key={status}
                        onClick={() => handleStatus(date, status)}
                        disabled={saving === date || locked}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                          rec.status === status ? active : `bg-white text-gray-600 border border-gray-200 ${hover}`
                        } disabled:opacity-50`}
                      >{label}</button>
                    ))}
                  </div>
                </div>
                {(rec.status === 'late' || rec.status === 'absent') && (
                  <div className="px-4 py-2.5 bg-white border-t border-gray-100 flex gap-2">
                    {rec.status === 'late' && (
                      <input type="text" placeholder="遅れる時間（例: 30分）" value={rec.late_time || ''}
                        disabled={locked}
                        onChange={(e) => handleField(date, 'late_time', e.target.value)}
                        onBlur={(e) => handleFieldBlur(date, 'late_time', e.target.value)}
                        className="w-36 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 disabled:opacity-50" />
                    )}
                    <input type="text" placeholder="理由を入力（任意）" value={rec.reason || ''}
                      disabled={locked}
                      onChange={(e) => handleField(date, 'reason', e.target.value)}
                      onBlur={(e) => handleFieldBlur(date, 'reason', e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300 bg-gray-50 disabled:opacity-50" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
