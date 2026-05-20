'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { isHoliday } from '@/lib/holidays'

type Tab = 'shift' | 'mtg'

const CYCLE: Record<string, string | null> = { undefined: 'full', full: 'am', am: 'pm', pm: null }
const CELL_STYLE: Record<string, string> = {
  full: 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200',
  am:   'bg-gradient-to-b from-sky-400 to-sky-200 text-white shadow-sm shadow-sky-200',
  pm:   'bg-gradient-to-b from-amber-300 to-amber-500 text-white shadow-sm shadow-amber-200',
}
const LABEL: Record<string, string | null> = { full: null, am: '前', pm: '後' }

export default function AttendancePage() {
  const today = new Date()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) ?? 'shift')

  // 共通
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  // シフト
  const [workMap, setWorkMap] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [deadlinePassed, setDeadlinePassed] = useState(false)
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null)

  // MTG
  const [fridays, setFridays] = useState<string[]>([])
  const [attendance, setAttendance] = useState<Record<string, any>>({})
  const [mtgDeadlineAt, setMtgDeadlineAt] = useState<string | null>(null)
  const [mtgDeadlinePassed, setMtgDeadlinePassed] = useState(false)
  const [mtgSaving, setMtgSaving] = useState<string | null>(null)
  const [mtgMessage, setMtgMessage] = useState('')

  // 管理者
  const [myRole, setMyRole] = useState('')
  const [shiftAll, setShiftAll] = useState<any[]>([])
  const [mtgAll, setMtgAll] = useState<{ dates: string[]; members: any[]; map: Record<number, Record<string, any>> } | null>(null)

  const prevMonth = () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) }

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setMyRole(d.role ?? '')).catch(() => {})
  }, [])

  // 管理者: シフト未提出取得
  useEffect(() => {
    if (tab !== 'shift' || (myRole !== 'manager' && myRole !== 'admin')) return
    fetch(`/api/shifts/all?year=${year}&month=${month}`).then(r => r.json()).then(d => setShiftAll(Array.isArray(d) ? d : [])).catch(() => {})
  }, [tab, year, month, myRole])

  // 管理者: MTG未提出取得
  useEffect(() => {
    if (tab !== 'mtg' || (myRole !== 'manager' && myRole !== 'admin')) return
    fetch(`/api/mtg/all?year=${year}&month=${month}`).then(r => r.json()).then(d => setMtgAll(d)).catch(() => {})
  }, [tab, year, month, myRole])

  // シフトデータ取得
  useEffect(() => {
    if (tab !== 'shift') return
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
  }, [year, month, tab])

  // MTGデータ取得
  useEffect(() => {
    if (tab !== 'mtg') return
    Promise.all([
      fetch(`/api/mtg/fridays?year=${year}&month=${month}`).then((r) => r.json()),
      fetch('/api/mtg/my').then((r) => r.json()),
      fetch(`/api/mtg/deadlines?year=${year}&month=${month}`).then((r) => r.json()),
    ]).then(([dates, map, dl]) => {
      setFridays(dates)
      setAttendance(map)
      setMtgDeadlineAt(dl.deadlineAt)
      setMtgDeadlinePassed(dl.deadlineAt ? new Date(dl.deadlineAt) < new Date() : false)
    })
  }, [year, month, tab])

  // シフト操作
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

  // MTG操作
  const todayStr = today.toISOString().slice(0, 10)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
  }

  const handleStatus = async (date: string, status: string) => {
    if (mtgDeadlinePassed || date < todayStr) return
    setMtgSaving(date)
    setMtgMessage('')
    const current = attendance[date] || {}
    try {
      const res = await fetch('/api/mtg/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, status, reason: current.reason || '', lateTime: current.late_time || '' }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setAttendance((prev) => ({ ...prev, [date]: { ...current, date, status } }))
      setMtgMessage('保存しました')
      setTimeout(() => setMtgMessage(''), 2000)
    } catch (err: any) {
      setMtgMessage(err.message)
    } finally {
      setMtgSaving(null)
    }
  }

  const handleField = (date: string, field: string, value: string) => {
    setAttendance((prev) => ({ ...prev, [date]: { ...(prev[date] || {}), [field]: value } }))
  }

  const handleFieldBlur = async (date: string, field: string, value: string) => {
    const current = attendance[date]
    if (!current || current.status === 'present') return
    if (mtgDeadlinePassed || date < todayStr) return
    setMtgSaving(date)
    try {
      const reason = field === 'reason' ? value : current.reason || ''
      const lateTime = field === 'late_time' ? value : current.late_time || ''
      await fetch('/api/mtg/my', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, status: current.status, reason, lateTime }),
      })
      setMtgMessage('保存しました')
      setTimeout(() => setMtgMessage(''), 2000)
    } finally {
      setMtgSaving(null)
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()
  const weeks = ['日', '月', '火', '水', '木', '金', '土']
  const totalDays = Object.keys(workMap).length

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <div className="mb-6 bg-gradient-to-r from-indigo-600 to-teal-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200 mb-1">Attendance</p>
        <h1 className="text-2xl font-bold">出欠管理</h1>
        <p className="text-sm text-indigo-100 mt-0.5">シフト入力・MTG出欠</p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('shift')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'shift' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          シフト入力
        </button>
        <button
          onClick={() => setTab('mtg')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'mtg' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          MTG出欠
        </button>
      </div>

      {/* 月ナビゲーション */}
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

        {/* シフトタブ */}
        {tab === 'shift' && (
          <>
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

            {/* 管理者: 未提出者一覧 */}
            {(myRole === 'manager' || myRole === 'admin') && shiftAll.length > 0 && (() => {
              const notSubmitted = shiftAll.filter(m => !m.submitted)
              if (notSubmitted.length === 0) return (
                <div className="mt-4 text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2 ring-1 ring-emerald-200">✅ 全員提出済み</div>
              )
              return (
                <div className="mt-4 bg-red-50 rounded-xl px-3 py-2.5 ring-1 ring-red-100">
                  <p className="text-xs font-bold text-red-600 mb-1.5">⚠️ 未提出（{notSubmitted.length}名）</p>
                  <div className="flex flex-wrap gap-1.5">
                    {notSubmitted.map(m => (
                      <span key={m.id} className="text-xs bg-white border border-red-200 text-red-700 px-2 py-0.5 rounded-full">{m.name}</span>
                    ))}
                  </div>
                </div>
              )
            })()}
          </>
        )}

        {/* MTGタブ */}
        {tab === 'mtg' && (
          <>
            {mtgDeadlinePassed && (
              <div className="mb-4 flex items-center gap-2 text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2.5 ring-1 ring-rose-200">
                提出期限が終了しています。変更はできません。
              </div>
            )}
            {mtgDeadlineAt && !mtgDeadlinePassed && (
              <div className="mb-4 text-xs text-gray-500 bg-amber-50 rounded-xl px-3 py-2 ring-1 ring-amber-100">
                締切: {new Date(mtgDeadlineAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users size={16} className="text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-gray-800">金曜MTG出欠</h3>
            </div>

            {mtgMessage && (
              <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2.5 ring-1 ring-emerald-200">{mtgMessage}</div>
            )}

            {fridays.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-6">この月に金曜日はありません</p>
            )}

            <div className="space-y-2">
              {fridays.map((date) => {
                const rec = attendance[date] || {}
                const isPast = date < todayStr
                const locked = isPast || mtgDeadlinePassed
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
                            disabled={mtgSaving === date || locked}
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

            {/* 管理者: MTG未回答者一覧 */}
            {(myRole === 'manager' || myRole === 'admin') && mtgAll && mtgAll.dates.length > 0 && (
              <div className="mt-4 space-y-2">
                {mtgAll.dates.map(date => {
                  const notAnswered = mtgAll.members.filter(m => !mtgAll.map[m.id]?.[date])
                  const d = new Date(date + 'T00:00:00')
                  const label = `${d.getMonth() + 1}/${d.getDate()}（金）`
                  return (
                    <div key={date} className={`rounded-xl px-3 py-2.5 ring-1 text-xs ${notAnswered.length === 0 ? 'bg-emerald-50 ring-emerald-200 text-emerald-600' : 'bg-red-50 ring-red-100'}`}>
                      {notAnswered.length === 0 ? (
                        <span>✅ {label} 全員回答済み</span>
                      ) : (
                        <>
                          <p className="font-bold text-red-600 mb-1">⚠️ {label} 未回答（{notAnswered.length}名）</p>
                          <div className="flex flex-wrap gap-1.5">
                            {notAnswered.map(m => (
                              <span key={m.id} className="bg-white border border-red-200 text-red-700 px-2 py-0.5 rounded-full">{m.name}</span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
