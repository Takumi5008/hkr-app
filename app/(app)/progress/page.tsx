'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus, Save } from 'lucide-react'

export default function ProgressPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [cancelTarget, setCancelTarget] = useState(0)
  const [workDates, setWorkDates] = useState<number[]>([])
  const [actualCancel, setActualCancel] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const todayDay = today.getDate()
  const todayMonth = today.getMonth() + 1
  const todayYear = today.getFullYear()
  const isCurrentMonth = year === todayYear && month === todayMonth

  useEffect(() => {
    fetch(`/api/progress?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => {
        setCancelTarget(d.cancelTarget)
        setWorkDates(d.workDates)
        setActualCancel(d.actualCancel)
      })
  }, [year, month])

  const prevMonth = () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) }

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()
  const weeks = ['日', '月', '火', '水', '木', '金', '土']

  const toggleDay = (day: number) => {
    setWorkDates((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    )
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, cancelTarget, workDates }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // 稼働日ごとの累計目標数を計算
  const sortedWorkDates = [...workDates].sort((a, b) => a - b)
  const total = sortedWorkDates.length

  const cumulativeTarget = (index: number) => {
    // index: 1始まり
    if (total === 0 || cancelTarget === 0) return 0
    return Math.round((cancelTarget * index) / total * 10) / 10
  }

  // 今日時点で何番目の稼働日か
  const workDaysTodayCount = isCurrentMonth
    ? sortedWorkDates.filter((d) => d <= todayDay).length
    : total

  const targetByToday = cumulativeTarget(workDaysTodayCount)
  const diff = actualCancel - targetByToday

  const formatDate = (day: number) => {
    const d = new Date(year, month - 1, day)
    const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
    return { label: `${month}/${day}（${dow}）`, dow: d.getDay() }
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <div className="mb-6 bg-gradient-to-r from-orange-500 to-amber-400 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-100 mb-1">Progress</p>
        <h1 className="text-2xl font-bold">個人進捗</h1>
        <p className="text-sm text-orange-100 mt-0.5">目標と稼働日を設定してペースを確認</p>
      </div>

      {/* 月ナビ */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-orange-50 text-orange-500 transition flex items-center justify-center">
          <ChevronLeft size={20} />
        </button>
        <span className="text-lg font-bold text-gray-800">{year}年 {month}月</span>
        <button onClick={nextMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-orange-50 text-orange-500 transition flex items-center justify-center">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 目標入力 */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-bold text-gray-700 shrink-0">解除目標</label>
          <input
            type="number"
            min={0}
            value={cancelTarget || ''}
            onChange={(e) => { setCancelTarget(parseInt(e.target.value) || 0); setSaved(false) }}
            placeholder="0"
            className="w-24 text-center text-lg font-bold border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <span className="text-sm text-gray-500">件</span>
        </div>

        {/* 稼働日カレンダー */}
        <p className="text-xs font-semibold text-gray-500 mb-2">稼働日を選択</p>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weeks.map((w, i) => (
            <div key={w} className={`text-center text-xs font-bold py-0.5 ${i === 0 ? 'text-rose-500' : i === 6 ? 'text-indigo-500' : 'text-gray-400'}`}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dow = (firstDay + day - 1) % 7
            const isWork = workDates.includes(day)
            const isToday = isCurrentMonth && day === todayDay
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`aspect-square rounded-lg text-xs font-semibold transition-all
                  ${isWork ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-50 hover:bg-orange-50'}
                  ${!isWork && dow === 0 ? 'text-rose-400' : ''}
                  ${!isWork && dow === 6 ? 'text-indigo-400' : ''}
                  ${!isWork && dow !== 0 && dow !== 6 ? 'text-gray-600' : ''}
                  ${isToday && !isWork ? 'ring-2 ring-orange-400' : ''}
                `}
              >
                {day}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-right">稼働日数：<span className="font-bold text-orange-500">{workDates.length}日</span></p>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-orange-500 to-amber-400 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition shadow-sm"
        >
          <Save size={15} />
          {saving ? '保存中...' : saved ? '✓ 保存しました' : '保存する'}
        </button>
      </div>

      {/* 今日の状況 */}
      {total > 0 && cancelTarget > 0 && (
        <div className={`rounded-2xl shadow-sm p-5 mb-4 text-white ${
          diff > 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
          diff < 0 ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
          'bg-gradient-to-r from-indigo-500 to-blue-500'
        }`}>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">
            {isCurrentMonth ? '今日時点の状況' : `${month}月の結果`}
          </p>
          <div className="flex items-center gap-3">
            {diff > 0
              ? <TrendingUp size={32} className="opacity-90" />
              : diff < 0
              ? <TrendingDown size={32} className="opacity-90" />
              : <Minus size={32} className="opacity-90" />}
            <div>
              <p className="text-3xl font-black leading-none">
                {diff > 0 ? `アド ${diff}` : diff < 0 ? `ビハ ${Math.abs(diff)}` : 'オンタイム'}
              </p>
              <p className="text-sm opacity-80 mt-1">
                実績 <span className="font-bold">{actualCancel}件</span> ／ 目標ペース <span className="font-bold">{targetByToday}件</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 稼働日ごとの累計目標一覧 */}
      {sortedWorkDates.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">稼働日別 累計目標</h3>
            <span className="text-xs text-gray-400">合計 {cancelTarget}件</span>
          </div>
          <div className="divide-y divide-gray-50">
            {sortedWorkDates.map((day, i) => {
              const { label, dow } = formatDate(day)
              const cumTarget = cumulativeTarget(i + 1)
              const isPast = isCurrentMonth ? day < todayDay : true
              const isToday = isCurrentMonth && day === todayDay
              return (
                <div key={day} className={`flex items-center px-4 py-2.5 ${isToday ? 'bg-orange-50' : ''}`}>
                  <div className="flex-1">
                    <span className={`text-sm font-semibold ${
                      dow === 0 ? 'text-rose-500' : dow === 6 ? 'text-indigo-500' : 'text-gray-700'
                    }`}>
                      {label}
                    </span>
                    {isToday && <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">今日</span>}
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-black ${
                      isPast || isToday ? 'text-orange-500' : 'text-gray-300'
                    }`}>
                      {cumTarget}件
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {sortedWorkDates.length === 0 && (
        <div className="text-center py-10 text-gray-300">
          <p className="text-sm font-medium">稼働日を選択してください</p>
        </div>
      )}
    </div>
  )
}
