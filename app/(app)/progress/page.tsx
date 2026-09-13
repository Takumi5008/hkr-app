'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus, Save, Lock, Users } from 'lucide-react'
import { isHoliday } from '@/lib/holidays'

type User = { id: number; name: string }
type MemberProgress = {
  id: number
  name: string
  cancelTarget: number
  actualCancel: number
  workDates: number[]
  hasRecord: boolean
  isActive: boolean
}

export default function ProgressPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [cancelTarget, setCancelTarget] = useState(0)
  const [actualCancel, setActualCancel] = useState(0)
  const [workDates, setWorkDates] = useState<number[]>([])
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null)
  const [deadlinePassed, setDeadlinePassed] = useState(false)
  const [role, setRole] = useState<string>('member')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [members, setMembers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [allProgress, setAllProgress] = useState<MemberProgress[]>([])
  const [allLoading, setAllLoading] = useState(false)
  const canViewAll = role === 'manager' || role === 'admin' || role === 'viewer'

  const todayDay = today.getDate()
  const todayMonth = today.getMonth() + 1
  const todayYear = today.getFullYear()
  const isCurrentMonth = year === todayYear && month === todayMonth

  const isViewingOther = selectedUserId !== null
  // カレンダー操作がロックされるか（メンバーかつ締切過ぎ、または他メンバー閲覧中）
  const calendarLocked = isViewingOther || (deadlinePassed && role !== 'manager' && role !== 'admin')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setRole(d.role ?? 'member')
      if (d.role === 'manager' || d.role === 'admin') {
        fetch('/api/users').then(r => r.json()).then((users: User[]) => {
          setMembers(users.filter((u: any) => u.role !== 'viewer'))
        })
      }
    })
  }, [])

  useEffect(() => {
    const userParam = selectedUserId ? `&userId=${selectedUserId}` : ''
    fetch(`/api/progress?year=${year}&month=${month}${userParam}`)
      .then((r) => r.json())
      .then((d) => {
        setCancelTarget(d.cancelTarget)
        setWorkDates(d.workDates)
        setActualCancel(d.actualCancel)
        setDeadlineAt(d.deadlineAt)
        setDeadlinePassed(d.deadlinePassed)
      })
  }, [year, month, selectedUserId])

  useEffect(() => {
    if (!showAll || !canViewAll) return
    setAllLoading(true)
    fetch(`/api/progress/all?year=${year}&month=${month}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAllProgress(Array.isArray(d) ? d : []))
      .finally(() => setAllLoading(false))
  }, [showAll, year, month, canViewAll])

  const prevMonth = () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) }

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()
  const weeks = ['日', '月', '火', '水', '木', '金', '土']

  const toggleDay = (day: number) => {
    if (calendarLocked) return
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

  const sortedWorkDates = [...workDates].sort((a, b) => a - b)
  const total = sortedWorkDates.length

  const cumulativeTarget = (index: number) => {
    if (total === 0 || cancelTarget === 0) return 0
    return Math.round((cancelTarget * index) / total)
  }

  const workDaysTodayCount = isCurrentMonth
    ? sortedWorkDates.filter((d) => d <= todayDay).length
    : total

  const targetByToday = cumulativeTarget(workDaysTodayCount)
  const diff = actualCancel - targetByToday

  const formatDate = (day: number) => {
    const d = new Date(year, month - 1, day)
    const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
    const holiday = isHoliday(year, month, day)
    const isRed = d.getDay() === 0 || holiday
    return { label: `${month}/${day}（${dow}）`, dow: d.getDay(), isRed }
  }

  // メンバー1人分のペース状況を計算（全体進捗ビュー用）
  const computeMemberPace = (m: MemberProgress) => {
    const days = [...m.workDates].sort((a, b) => a - b)
    const memberTotal = days.length
    const daysDoneToday = isCurrentMonth ? days.filter((d) => d <= todayDay).length : memberTotal
    const memberTargetByToday = memberTotal === 0 || m.cancelTarget === 0
      ? 0
      : Math.round((m.cancelTarget * daysDoneToday) / memberTotal)
    const memberDiff = m.actualCancel - memberTargetByToday
    const pct = m.cancelTarget > 0 ? Math.min(Math.round((m.actualCancel / m.cancelTarget) * 100), 100) : 0
    return { memberTotal, memberTargetByToday, memberDiff, pct }
  }

  // 退会済みでも当月の目標・稼働予定が残っているメンバーは、目標件数の合算には含めるが
  // 稼働人数やメンバー一覧のカードには出さない（在籍中メンバーのみに絞る）
  const activeProgress = allProgress.filter((m) => m.isActive)

  const teamCancelTarget = allProgress.reduce((s, m) => s + m.cancelTarget, 0)
  const teamActualCancel = allProgress.reduce((s, m) => s + m.actualCancel, 0)
  const teamTargetByToday = allProgress.reduce((s, m) => s + computeMemberPace(m).memberTargetByToday, 0)
  const teamDiff = teamActualCancel - teamTargetByToday
  const aheadCount = activeProgress.filter((m) => computeMemberPace(m).memberDiff >= 0 && (m.cancelTarget > 0 || m.actualCancel > 0)).length
  const trackedCount = activeProgress.filter((m) => m.cancelTarget > 0 || m.actualCancel > 0).length

  // 指定した暦日までの、1メンバー分の累計目標（個人ページの累計目標と同じ計算をその日付ベースで算出）
  const memberCumAt = (m: MemberProgress, day: number) => {
    const memberTotal = m.workDates.length
    if (memberTotal === 0 || m.cancelTarget === 0) return 0
    const doneCount = m.workDates.filter((d) => d <= day).length
    return Math.round((m.cancelTarget * doneCount) / memberTotal)
  }
  // 全メンバー（退会済みの目標のみ残っている人も含む）の累計目標を合算した「チーム全体の累計目標」（指定日まで）
  const teamCumAt = (day: number) => allProgress.reduce((s, m) => s + memberCumAt(m, day), 0)
  // 指定した日に稼働予定のメンバー数（在籍中メンバーのみ）
  const teamHeadcountAt = (day: number) => activeProgress.filter((m) => m.workDates.includes(day)).length

  // チームの誰かが稼働する日（＝チーム累計が動きうる日）を昇順で列挙
  const teamWorkDaySet = new Set<number>()
  allProgress.forEach((m) => m.workDates.forEach((d) => teamWorkDaySet.add(d)))
  const teamWorkDays = [...teamWorkDaySet].sort((a, b) => a - b)

  return (
    <div className={`p-4 sm:p-6 mx-auto ${showAll ? 'max-w-2xl' : 'max-w-lg'}`}>
      <div className="mb-6 bg-gradient-to-r from-orange-500 to-amber-400 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange-100 mb-1">Progress</p>
        <h1 className="text-2xl font-bold">{showAll ? '全体進捗' : '個人進捗'}</h1>
        <p className="text-sm text-orange-100 mt-0.5">
          {showAll ? 'メンバー全員の目標と実績ペースを確認' : '目標と稼働日を設定してペースを確認'}
        </p>
      </div>

      {/* 個人 / 全体 切り替え（マネージャー・管理者・閲覧者のみ） */}
      {canViewAll && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowAll(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
              !showAll ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-orange-50'
            }`}
          >
            個人
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
              showAll ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-orange-50'
            }`}
          >
            全体
          </button>
        </div>
      )}

      {/* メンバー選択（マネージャー・管理者のみ） */}
      {!showAll && (role === 'manager' || role === 'admin') && members.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-500 shrink-0">メンバー</span>
          <select
            value={selectedUserId ?? ''}
            onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          >
            <option value="">自分</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      )}

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

      {!showAll && (
      <>
      {/* 目標入力 */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm font-bold text-gray-700 w-24 shrink-0">解除目標</label>
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
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-bold text-gray-700 w-24 shrink-0">現状解除数</label>
          <div className="w-24 text-center text-lg font-bold border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-gray-700">
            {actualCancel}
          </div>
          <span className="text-sm text-gray-500">件</span>
          <span className="text-xs text-gray-400">（行動表から自動反映）</span>
        </div>

        {/* 稼働日カレンダー */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500">稼働日（シフトから自動反映）</p>
          {calendarLocked && (
            <span className="flex items-center gap-1 text-xs text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full font-semibold">
              <Lock size={10} />締切済み
            </span>
          )}
          {deadlineAt && !deadlinePassed && (
            <span className="text-xs text-gray-400">
              締切 {new Date(deadlineAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
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
            const holiday = isHoliday(year, month, day)
            const isRed = dow === 0 || holiday
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                disabled={calendarLocked}
                className={`aspect-square rounded-lg text-xs font-semibold transition-all
                  ${isWork
                    ? calendarLocked ? 'bg-orange-300 text-white' : 'bg-orange-500 text-white shadow-sm'
                    : calendarLocked ? 'bg-gray-50 text-gray-300 cursor-default' : 'bg-gray-50 hover:bg-orange-50'}
                  ${!isWork && !calendarLocked && isRed ? 'text-rose-400' : ''}
                  ${!isWork && !calendarLocked && dow === 6 && !holiday ? 'text-indigo-400' : ''}
                  ${!isWork && !calendarLocked && !isRed && dow !== 6 ? 'text-gray-600' : ''}
                  ${isToday && !isWork ? 'ring-2 ring-orange-400' : ''}
                `}
              >
                {day}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-right">稼働日数：<span className="font-bold text-orange-500">{workDates.length}日</span></p>

        {!isViewingOther && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-orange-500 to-amber-400 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition shadow-sm"
          >
            <Save size={15} />
            {saving ? '保存中...' : saved ? '✓ 保存しました' : '保存する'}
          </button>
        )}
      </div>

      {/* 今日の状況 */}
      {total > 0 && (cancelTarget > 0 || actualCancel > 0) && (
        <div className={`rounded-2xl shadow-sm p-5 mb-4 text-white ${
          diff > 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
          diff < 0 ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
          'bg-gradient-to-r from-indigo-500 to-blue-500'
        }`}>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">
            {isCurrentMonth ? '今日時点の状況' : `${month}月の結果`}
          </p>
          <div className="flex items-center gap-3">
            {diff > 0 ? <TrendingUp size={32} className="opacity-90" /> :
             diff < 0 ? <TrendingDown size={32} className="opacity-90" /> :
             <Minus size={32} className="opacity-90" />}
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

      {/* 稼働日ごとの目標一覧 */}
      {sortedWorkDates.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">稼働日別 目標（当日ノルマ／累計）</h3>
            <span className="text-xs text-gray-400">合計 {cancelTarget}件</span>
          </div>
          <div className="divide-y divide-gray-50">
            {sortedWorkDates.map((day, i) => {
              const { label, dow, isRed } = formatDate(day)
              const cumTarget = cumulativeTarget(i + 1)
              const dailyQuota = cumTarget - cumulativeTarget(i)
              const isPast = isCurrentMonth ? day < todayDay : true
              const isToday = isCurrentMonth && day === todayDay
              return (
                <div key={day} className={`flex items-center px-4 py-2.5 ${isToday ? 'bg-orange-50' : ''}`}>
                  <div className="flex-1">
                    <span className={`text-sm font-semibold ${
                      isRed ? 'text-rose-500' : dow === 6 ? 'text-indigo-500' : 'text-gray-700'
                    }`}>
                      {label}
                    </span>
                    {isToday && <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">今日</span>}
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-black ${isPast || isToday ? 'text-orange-500' : 'text-gray-300'}`}>
                      {dailyQuota}件
                    </span>
                    <span className="block text-xs text-gray-400">累計 {cumTarget}件</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {sortedWorkDates.length === 0 && (
        <div className="text-center py-10 text-gray-300">
          <p className="text-sm font-medium">シフトを提出すると稼働日が自動反映されます</p>
        </div>
      )}
      </>
      )}

      {/* 全体進捗 */}
      {showAll && (
        <>
          {allLoading ? (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 py-10 text-center text-gray-400 text-sm">
              読み込み中...
            </div>
          ) : allProgress.length === 0 ? (
            <div className="text-center py-10 text-gray-300">
              <p className="text-sm font-medium">メンバーの進捗データがありません</p>
            </div>
          ) : (
            <>
              {/* チーム全体サマリー */}
              {(teamCancelTarget > 0 || teamActualCancel > 0) && (
                <div className={`rounded-2xl shadow-sm p-5 mb-4 text-white ${
                  teamDiff > 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                  teamDiff < 0 ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
                  'bg-gradient-to-r from-indigo-500 to-blue-500'
                }`}>
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">
                    {isCurrentMonth ? 'チーム 今日時点の状況' : `チーム ${month}月の結果`}
                  </p>
                  <div className="flex items-center gap-3 mb-3">
                    {teamDiff > 0 ? <TrendingUp size={32} className="opacity-90" /> :
                     teamDiff < 0 ? <TrendingDown size={32} className="opacity-90" /> :
                     <Minus size={32} className="opacity-90" />}
                    <div>
                      <p className="text-3xl font-black leading-none">
                        {teamDiff > 0 ? `アド ${teamDiff}` : teamDiff < 0 ? `ビハ ${Math.abs(teamDiff)}` : 'オンタイム'}
                      </p>
                      <p className="text-sm opacity-80 mt-1">
                        実績 <span className="font-bold">{teamActualCancel}件</span> ／ 目標ペース <span className="font-bold">{teamTargetByToday}件</span>
                        <span className="opacity-70">（目標合計 {teamCancelTarget}件）</span>
                      </p>
                    </div>
                  </div>
                  {trackedCount > 0 && (
                    <p className="text-xs opacity-90 border-t border-white/20 pt-2">
                      ペース以上 {aheadCount} / {trackedCount}人
                    </p>
                  )}
                </div>
              )}

              {/* チーム日別ノルマ（全員の累計目標を合算し、前日との差分をその日のノルマとする） */}
              {teamWorkDays.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden mb-4">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700">チーム日別ノルマ（全員合算）</h3>
                    <span className="text-xs text-gray-400">合計 {teamCancelTarget}件</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {teamWorkDays.map((day) => {
                      const { label, dow, isRed } = formatDate(day)
                      const cumToday = teamCumAt(day)
                      const dailyQuota = cumToday - teamCumAt(day - 1)
                      const headcount = teamHeadcountAt(day)
                      const isPast = isCurrentMonth ? day < todayDay : true
                      const isToday = isCurrentMonth && day === todayDay
                      return (
                        <div key={day} className={`flex items-center px-4 py-2.5 ${isToday ? 'bg-orange-50' : ''}`}>
                          <div className="flex-1">
                            <div>
                              <span className={`text-sm font-semibold ${
                                isRed ? 'text-rose-500' : dow === 6 ? 'text-indigo-500' : 'text-gray-700'
                              }`}>
                                {label}
                              </span>
                              {isToday && <span className="ml-2 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">今日</span>}
                            </div>
                            <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-gray-400">
                              <Users size={11} />稼働 {headcount}人
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`text-base font-black ${isPast || isToday ? 'text-orange-500' : 'text-gray-300'}`}>
                              {dailyQuota}件
                            </span>
                            <span className="block text-xs text-gray-400">累計 {cumToday}件</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* メンバー別一覧 */}
              <div className="space-y-3">
                {activeProgress.map((m) => {
                  const { memberTotal, memberTargetByToday, memberDiff, pct } = computeMemberPace(m)
                  const untracked = m.cancelTarget === 0 && m.actualCancel === 0
                  return (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedUserId(m.id); setShowAll(false) }}
                      className="w-full text-left bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 hover:ring-orange-200 transition"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-800">{m.name}</span>
                        {untracked ? (
                          <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">未設定</span>
                        ) : (
                          <span className={`text-sm font-black ${
                            memberDiff > 0 ? 'text-emerald-600' : memberDiff < 0 ? 'text-rose-600' : 'text-indigo-600'
                          }`}>
                            {memberDiff > 0 ? `アド ${memberDiff}` : memberDiff < 0 ? `ビハ ${Math.abs(memberDiff)}` : 'オンタイム'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
                        <span>実績 <b className="text-gray-800">{m.actualCancel}</b>件</span>
                        <span>目標 <b className="text-gray-800">{m.cancelTarget}</b>件</span>
                        <span>目標ペース {memberTargetByToday}件</span>
                        <span>稼働 {memberTotal}日</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-400' : 'bg-orange-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
