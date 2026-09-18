'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus, Save, Lock, Users } from 'lucide-react'
import { isHoliday } from '@/lib/holidays'
import TeamAdminPanel from '@/components/TeamAdminPanel'

type User = { id: number; name: string; is_active?: boolean }
type ChallengeTeam = { id: number; name: string; target: number; memberIds: number[] }
type MemberProgress = {
  id: number
  name: string
  cancelTarget: number
  actualCancel: number
  workDates: number[]
  // シフトに実際に提出された稼働日のみ（進捗ページで目標配分用に手入力しただけの日は含まない）
  shiftDays: number[]
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
  const [myEmail, setMyEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [members, setMembers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [allProgress, setAllProgress] = useState<MemberProgress[]>([])
  const [allLoading, setAllLoading] = useState(false)
  const [challengeTeams, setChallengeTeams] = useState<ChallengeTeam[]>([])
  const canViewAll = role === 'manager' || role === 'admin' || role === 'viewer'
  const isKomoriya = myEmail === 'komotaku0508@gmail.com'

  // 目標算出ツール（小守谷さんのみ表示）：過去の解除生産性（件/日）から目標解除数を逆算する
  const [goalMonths, setGoalMonths] = useState(3)
  const [goalWorkDaysInput, setGoalWorkDaysInput] = useState('')
  const [goalData, setGoalData] = useState<{
    months: { year: number; month: number; cancel: number; workDays: number; dayProductivity: number | null }[]
    avgDayProductivity: number | null
  } | null>(null)
  const [goalLoading, setGoalLoading] = useState(false)

  const todayDay = today.getDate()
  const todayMonth = today.getMonth() + 1
  const todayYear = today.getFullYear()
  const isCurrentMonth = year === todayYear && month === todayMonth

  const isViewingOther = selectedUserId !== null
  // カレンダー操作がロックされるか（メンバーかつ締切過ぎの場合のみ。マネージャー・管理者は他メンバー閲覧中でも編集可）
  const calendarLocked = deadlinePassed && role !== 'manager' && role !== 'admin'

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setRole(d.role ?? 'member')
      setMyEmail(d.email ?? '')
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

  const fetchAllData = () => {
    if (!canViewAll) return
    setAllLoading(true)
    Promise.all([
      fetch(`/api/progress/all?year=${year}&month=${month}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/challenge/teams?year=${year}&month=${month}`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([progress, teams]) => {
        setAllProgress(Array.isArray(progress) ? progress : [])
        setChallengeTeams(Array.isArray(teams) ? teams : [])
      })
      .finally(() => setAllLoading(false))
  }

  useEffect(() => {
    if (!showAll || !canViewAll) return
    fetchAllData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll, year, month, canViewAll])

  useEffect(() => {
    if (!isKomoriya || showAll || isViewingOther) return
    setGoalLoading(true)
    fetch(`/api/my/day-productivity?year=${year}&month=${month}&months=${goalMonths}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setGoalData(d))
      .finally(() => setGoalLoading(false))
  }, [isKomoriya, showAll, isViewingOther, year, month, goalMonths])

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
      body: JSON.stringify({ year, month, cancelTarget, workDates, userId: selectedUserId ?? undefined }),
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

  // チーム（チャレンジページで組んだチーム分け）ごとの解除進捗を集計
  const teamRollups = challengeTeams.map((team) => {
    const teamMembers = allProgress.filter((m) => team.memberIds.includes(m.id))
    const cancelTarget = teamMembers.reduce((s, m) => s + m.cancelTarget, 0)
    const actualCancel = teamMembers.reduce((s, m) => s + m.actualCancel, 0)
    const targetByToday = teamMembers.reduce((s, m) => s + computeMemberPace(m).memberTargetByToday, 0)
    const diff = actualCancel - targetByToday
    const pct = cancelTarget > 0 ? Math.min(Math.round((actualCancel / cancelTarget) * 100), 100) : 0
    return { ...team, memberCount: teamMembers.length, cancelTarget, actualCancel, targetByToday, diff, pct }
  })
  // どのチームにも属していないメンバー（チーム分けが設定されている場合のみ意味を持つ）
  const assignedIds = new Set(challengeTeams.flatMap((t) => t.memberIds))
  const unassignedMembers = challengeTeams.length > 0 ? activeProgress.filter((m) => !assignedIds.has(m.id)) : []

  // 指定した暦日までの、1メンバー分の累計目標（個人ページの累計目標と同じ計算をその日付ベースで算出）
  const memberCumAt = (m: MemberProgress, day: number) => {
    const memberTotal = m.workDates.length
    if (memberTotal === 0 || m.cancelTarget === 0) return 0
    const doneCount = m.workDates.filter((d) => d <= day).length
    return Math.round((m.cancelTarget * doneCount) / memberTotal)
  }
  // 全メンバー（退会済みの目標のみ残っている人も含む）の累計目標を合算した「チーム全体の累計目標」（指定日まで）
  const teamCumAt = (day: number) => allProgress.reduce((s, m) => s + memberCumAt(m, day), 0)
  // 指定した日に稼働予定のメンバー数（在籍中メンバーのみ）。
  // シフト提出済みの稼働日だけを数える（進捗ページで目標配分用に手入力しただけの日はカウントしない）
  const teamHeadcountAt = (day: number) => activeProgress.filter((m) => m.shiftDays.includes(day)).length

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
              <option key={m.id} value={m.id}>{m.name}{m.is_active === false ? '（退会）' : ''}</option>
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
      {/* 目標算出ツール（小守谷さん専用） */}
      {isKomoriya && !isViewingOther && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-700">目標算出ツール</p>
            <select
              value={goalMonths}
              onChange={(e) => setGoalMonths(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
            >
              <option value={1}>直近1ヶ月平均</option>
              <option value={3}>直近3ヶ月平均</option>
              <option value={6}>直近6ヶ月平均</option>
            </select>
          </div>

          {goalLoading ? (
            <p className="text-xs text-gray-400">読み込み中...</p>
          ) : !goalData || goalData.avgDayProductivity === null ? (
            <p className="text-xs text-gray-400">過去の実績データがまだありません（{month}月より前の行動表を記入すると算出できます）</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
                {goalData.months.map((m) => (
                  <span key={`${m.year}-${m.month}`} className="text-xs text-gray-400">
                    {m.month}月：{m.dayProductivity !== null ? `${m.dayProductivity}件/日` : 'データなし'}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mb-3">
                過去実績の解除生産性（平均）：<span className="font-bold text-gray-800">{goalData.avgDayProductivity}件/日</span>
              </p>
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-gray-700 w-24 shrink-0">稼働日数</label>
                <input
                  type="number"
                  min={0}
                  value={goalWorkDaysInput}
                  onChange={(e) => setGoalWorkDaysInput(e.target.value)}
                  placeholder="0"
                  className="w-24 text-center text-lg font-bold border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="text-sm text-gray-500">日</span>
              </div>
              {goalWorkDaysInput !== '' && (
                <p className="text-sm text-gray-700 mt-3 bg-orange-50 rounded-xl px-4 py-2.5">
                  推奨目標：<span className="text-xl font-black text-orange-600">
                    {Math.round(goalData.avgDayProductivity * (parseInt(goalWorkDaysInput) || 0))}
                  </span>件
                  <span className="text-xs text-gray-400 ml-2">
                    （{goalData.avgDayProductivity}件/日 × {goalWorkDaysInput}日）
                  </span>
                </p>
              )}
            </>
          )}
        </div>
      )}

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

        {isViewingOther && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 mt-3">
            {members.find((m) => m.id === selectedUserId)?.name ?? 'このメンバー'}さんの目標・稼働予定を代理入力しています
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-orange-500 to-amber-400 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition shadow-sm"
        >
          <Save size={15} />
          {saving ? '保存中...' : saved ? '✓ 保存しました' : isViewingOther ? 'このメンバーの分を保存する' : '保存する'}
        </button>
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

              {/* チームごとの解除進捗 */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-600 mb-2">チーム別 解除進捗</h3>
                {(role === 'manager' || role === 'admin') && (
                  <div className="mb-3">
                    <TeamAdminPanel
                      year={year}
                      month={month}
                      currentTeams={challengeTeams}
                      allUsers={allProgress.map((m) => ({ id: m.id, name: m.name, is_active: m.isActive }))}
                      onChange={fetchAllData}
                    />
                  </div>
                )}
                {challengeTeams.length === 0 ? (
                  <p className="text-xs text-gray-400 bg-white rounded-2xl border border-gray-100 px-4 py-3">
                    この月のチームは設定されていません（上の「チーム編集」から追加できます）
                  </p>
                ) : (
                  <div className="space-y-3">
                    {teamRollups.map((team) => (
                      <div key={team.id} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-gray-800">{team.name}<span className="ml-2 text-xs font-normal text-gray-400">{team.memberCount}人</span></span>
                          {team.cancelTarget === 0 && team.actualCancel === 0 ? (
                            <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">未設定</span>
                          ) : (
                            <span className={`text-sm font-black ${
                              team.diff > 0 ? 'text-emerald-600' : team.diff < 0 ? 'text-rose-600' : 'text-indigo-600'
                            }`}>
                              {team.diff > 0 ? `アド ${team.diff}` : team.diff < 0 ? `ビハ ${Math.abs(team.diff)}` : 'オンタイム'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
                          <span>実績 <b className="text-gray-800">{team.actualCancel}</b>件</span>
                          <span>目標 <b className="text-gray-800">{team.cancelTarget}</b>件</span>
                          <span>目標ペース {team.targetByToday}件</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${team.pct >= 100 ? 'bg-emerald-400' : 'bg-orange-400'}`}
                            style={{ width: `${team.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {unassignedMembers.length > 0 && (
                      <p className="text-xs text-gray-400 px-1">
                        チーム未所属：{unassignedMembers.map((m) => m.name).join('、')}
                      </p>
                    )}
                  </div>
                )}
              </div>

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
