import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'
import { calcHKR, formatMonth, getTwoMonthsAgo, isMonthlyCheckPeriod } from '@/lib/hkr'
import HKRCard from '@/components/HKRCard'
import TodayTasksList, { type TodayTask, type FollowAlert } from '@/components/TodayTasksList'
import { Bell, AlertCircle, PenLine } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session.userId) redirect('/login')

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentDay = now.getDate()
  const twoAgo = getTwoMonthsAgo()
  const showBanner = isMonthlyCheckPeriod()

  const mm = String(currentMonth).padStart(2, '0')
  const dd = String(currentDay).padStart(2, '0')
  const todayStr = `${currentYear}-${mm}-${dd}`

  // Multiple date formats for matching against activation_records fields
  const todayFmts = [
    todayStr,
    `${currentYear}/${mm}/${dd}`,
    `${currentYear}/${currentMonth}/${currentDay}`,
    `${currentMonth}/${currentDay}`,
    `${mm}/${dd}`,
    `${currentMonth}月${currentDay}日`,
    `${mm}月${dd}日`,
  ]
  // $2 onward because $1 = user_id
  const ph = todayFmts.map((_, i) => `$${i + 2}`).join(', ')

  const productRows = await dbQuery('SELECT name FROM products ORDER BY sort_order, id')
  const products = productRows.map((p: any) => p.name)

  const records = await dbQuery(
    `SELECT * FROM records WHERE user_id = $1 AND ((year = $2 AND month = $3) OR (year = $4 AND month = $5))`,
    [session.userId, currentYear, currentMonth, twoAgo.year, twoAgo.month]
  )

  // Run all today's task condition queries in parallel
  const [shiftRows, activityRows, calendarRows, sonetRows, directRows, postRows] = await Promise.all([
    dbQuery(
      `SELECT work_dates FROM shifts WHERE user_id = $1 AND year = $2 AND month = $3`,
      [session.userId, currentYear, currentMonth]
    ).catch(() => []),
    dbQuery(
      `SELECT cancel FROM daily_activity WHERE user_id = $1 AND date = $2 AND cancel > 0`,
      [session.userId, todayStr]
    ).catch(() => []),
    dbQuery(
      `SELECT status FROM opening_calendar WHERE user_id = $1 AND year = $2 AND month = $3`,
      [session.userId, currentYear, currentMonth]
    ).catch(() => []),
    dbQuery(
      `SELECT ar.name FROM activation_records ar WHERE ar.user_id = $1 AND ar.type='sonet' AND ar.construction_date IN (${ph})`,
      [session.userId, ...todayFmts]
    ).catch(() => []),
    dbQuery(
      `SELECT ar.name FROM activation_records ar WHERE ar.user_id = $1 AND ar.type='wimax_direct' AND ar.week_after IN (${ph})`,
      [session.userId, ...todayFmts]
    ).catch(() => []),
    dbQuery(
      `SELECT ar.name FROM activation_records ar WHERE ar.user_id = $1 AND ar.type='wimax_post' AND ar.week_after_delivery IN (${ph})`,
      [session.userId, ...todayFmts]
    ).catch(() => []),
  ])

  // 行動表: 今日がシフトの日か
  const todayInShift = (() => {
    if (!shiftRows.length) return false
    try {
      const workDates = JSON.parse(shiftRows[0].work_dates)
      return Array.isArray(workDates) && workDates.some((d: any) => Number(d.day) === currentDay)
    } catch { return false }
  })()

  // 個人進捗: 本日 cancel > 0
  const hasPersonalProgress = activityRows.length > 0

  // 開通カレンダー
  const hasCalendarEntries = calendarRows.length > 0
  const calendarCircleCount = (calendarRows as any[]).filter((r: any) => r.status === '○').length

  // HKR入力: 開通カレンダーの○件数 ≠ 今月の records 開通件数合計のとき表示
  const currentActivationTotal = (records as any[])
    .filter((r: any) => r.year === currentYear && r.month === currentMonth)
    .reduce((s: number, r: any) => s + (r.activation_count ?? 0), 0)
  const needsHKRInput = hasCalendarEntries && calendarCircleCount !== currentActivationTotal

  // 開通表確認 / フォロー対応 (自分の分のみ)
  const followAlerts: FollowAlert[] = [
    ...(sonetRows as any[]).map((r: any) => ({ name: r.name, typeLabel: 'So-net', fieldLabel: '工事日当日' })),
    ...(directRows as any[]).map((r: any) => ({ name: r.name, typeLabel: 'WiMAX直せち', fieldLabel: '獲得後1週間後' })),
    ...(postRows as any[]).map((r: any) => ({ name: r.name, typeLabel: 'WiMAX後送り', fieldLabel: '受取日1週間後' })),
  ]
  const hasFollowToday = followAlerts.length > 0

  // 今日やるべきタスク一覧（条件付き）
  // done=undefined → 手動チェック(localStorage)、done=boolean → 自動判定
  const todoItems: TodayTask[] = []
  if (hasFollowToday)      todoItems.push({ key: 'follow',   label: '開通表確認',           href: '/activation' })
  if (hasCalendarEntries)  todoItems.push({ key: 'calendar', label: '開通カレンダーチェック', href: '/input' })
  if (needsHKRInput)       todoItems.push({ key: 'hkr',      label: 'HKR入力',              href: '/input' })
  if (todayInShift)        todoItems.push({ key: 'activity', label: '行動表記入',            href: '/activity' })
  if (hasPersonalProgress) todoItems.push({ key: 'progress', label: '個人進捗確認',          href: '/progress' })

  function getSummaries(year: number, month: number) {
    return products.map((product: string) => {
      const r = (records as any[]).find((r: any) => r.year === year && r.month === month && r.product === product)
      const cancel = r?.cancel_count ?? 0
      const activation = r?.activation_count ?? 0
      return { product, cancel_count: cancel, activation_count: activation, hkr: calcHKR(activation, cancel) }
    })
  }

  const currentSummaries = getSummaries(currentYear, currentMonth)
  const twoAgoSummaries = getSummaries(twoAgo.year, twoAgo.month)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* ページヘッダー */}
      <div className="mb-6 bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200 mb-1">Dashboard</p>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-indigo-200 mt-0.5">{formatMonth(currentYear, currentMonth)}の進捗状況</p>
      </div>

      {/* 今日やること */}
      <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          📋 今日やること
        </h2>
        <TodayTasksList items={todoItems} followAlerts={followAlerts} />
      </div>

      {showBanner && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 shadow-sm">
          <Bell size={20} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {formatMonth(twoAgo.year, twoAgo.month)}のHKR確認期間です
            </p>
            <p className="text-xs text-amber-600 mt-0.5">2ヶ月前の開通結果が確定しました。</p>
          </div>
        </div>
      )}

      {showBanner && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" />
            {formatMonth(twoAgo.year, twoAgo.month)}の結果
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {twoAgoSummaries.map((s) => (
              <HKRCard key={s.product} {...s} highlight />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">
            {formatMonth(currentYear, currentMonth)}のHKR
          </h2>
          <Link href="/input" className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
            <PenLine size={14} />データ入力
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentSummaries.map((s) => (
            <HKRCard key={s.product} {...s} />
          ))}
        </div>
      </section>
    </div>
  )
}
