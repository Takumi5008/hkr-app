'use client'

import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'

export default function MtgPage() {
  const [fridays, setFridays] = useState<string[]>([])
  const [attendance, setAttendance] = useState<Record<string, any>>({})
  const [deadlines, setDeadlines] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/mtg/fridays').then((r) => r.json()),
      fetch('/api/mtg/my').then((r) => r.json()),
      fetch('/api/mtg/deadlines').then((r) => r.json()),
    ]).then(([dates, map, dl]) => {
      setFridays(dates)
      setAttendance(map)
      setDeadlines(dl)
    })
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const isDeadlinePassed = (date: string) => {
    const dl = deadlines[date]
    return dl ? new Date(dl) < new Date() : false
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
  }

  const handleStatus = async (date: string, status: string) => {
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
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Users size={16} className="text-emerald-600" />
          </div>
          <h3 className="text-base font-bold text-gray-800">MTG出欠（毎週金曜日）</h3>
        </div>

        {message && (
          <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2.5 ring-1 ring-emerald-200">{message}</div>
        )}

        <div className="space-y-2">
          {fridays.map((date) => {
            const rec = attendance[date] || {}
            const isPast = date < today
            const locked = isPast || isDeadlinePassed(date)
            const dl = deadlines[date]
            return (
              <div key={date} className={`rounded-xl ring-1 overflow-hidden ${locked ? 'ring-gray-100 opacity-75' : 'ring-indigo-100'}`}>
                <div className={`flex items-center justify-between px-4 py-2.5 ${locked ? 'bg-gray-50' : 'bg-indigo-50/50'}`}>
                  <div>
                    <span className={`text-sm font-bold ${locked ? 'text-gray-500' : 'text-gray-800'}`}>
                      {formatDate(date)}
                      {date === today && <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">今週</span>}
                    </span>
                    {dl && (
                      <span className={`ml-2 text-xs ${isDeadlinePassed(date) ? 'text-rose-400' : 'text-gray-400'}`}>
                        締切 {new Date(dl).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
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
