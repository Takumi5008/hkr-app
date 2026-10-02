import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne } from '@/lib/db'

function extractWorkDays(workDatesJson: string): number[] {
  const raw = JSON.parse(workDatesJson ?? '[]')
  if (!Array.isArray(raw) || raw.length === 0) return []
  if (typeof raw[0] === 'number') return raw
  return raw.map((w: any) => w.day)
}

const CONSTRUCTION_TYPES = ['sonet', 'nifty', 'sbhikari']

async function monthStats(year: number, month: number) {
  const row = await dbQueryOne<{ cancel: number; activation: number; cancel_flag: number }>(
    `SELECT
       COUNT(CASE WHEN cancel = '○' THEN 1 END)::int AS cancel,
       COUNT(CASE WHEN activation = '○' THEN 1 END)::int AS activation,
       COUNT(CASE WHEN activation = '×' THEN 1 END)::int AS cancel_flag
     FROM activation_records WHERE year = $1 AND month = $2`,
    [year, month]
  )
  const cancel = row?.cancel ?? 0
  const activation = row?.activation ?? 0
  const cancelled = row?.cancel_flag ?? 0
  const openingRate = cancel > 0 ? Math.round((activation / cancel) * 1000) / 10 : null
  return { cancel, activation, cancelled, openingRate }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'admin') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const past3 = [1, 2, 3].map((n) => {
    let y = year, m = month - n
    while (m <= 0) { m += 12; y -= 1 }
    return { year: y, month: m }
  })

  const typesPh = CONSTRUCTION_TYPES.map((_, i) => `$${i + 1}`).join(', ')

  const [
    users, shiftRows, activityCountRows, activityLastRows, activationLastRows,
    constructionUnconfirmed, activationMissing, updateOverdue, reviewPending,
    thisMonth, prevMonthStats, past3Stats,
  ] = await Promise.all([
    dbQuery<{ id: number }>(`SELECT id FROM users WHERE is_active = true AND role NOT IN ('viewer', 'shift_viewer')`, []),
    dbQuery<{ user_id: number; work_dates: string }>(
      `SELECT user_id, work_dates FROM shifts WHERE year = $1 AND month = $2 AND submitted = 1`, [year, month]
    ),
    dbQuery<{ user_id: number; date: string }>(
      `SELECT user_id, date FROM daily_activity WHERE date LIKE $1 AND work_hours IS NOT NULL AND work_hours != ''`,
      [`${year}-${String(month).padStart(2, '0')}-%`]
    ),
    dbQuery<{ user_id: number; last_updated: string }>(
      `SELECT user_id, MAX(updated_at) AS last_updated FROM daily_activity WHERE updated_at != '' GROUP BY user_id`, []
    ),
    dbQuery<{ user_id: number; last_updated: string }>(
      `SELECT user_id, MAX(updated_at) AS last_updated FROM activation_records WHERE updated_at != '' GROUP BY user_id`, []
    ),
    dbQueryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM activation_records
       WHERE type IN (${typesPh}) AND construction_date != '' AND construction_date != '未定'
         AND construction_date_done != 1 AND (activation IS NULL OR activation = '')`,
      CONSTRUCTION_TYPES
    ),
    dbQueryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM activation_records WHERE (activation IS NULL OR activation = '')`, []
    ),
    dbQueryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM activation_records
       WHERE (activation IS NULL OR activation = '')
         AND (updated_at = '' OR updated_at < TO_CHAR(NOW() - INTERVAL '7 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))`,
      []
    ),
    dbQueryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM activation_records WHERE activation IN ('○', '×') AND review_status != '○'`, []
    ),
    monthStats(year, month),
    monthStats(prevMonth.year, prevMonth.month),
    Promise.all(past3.map((p) => monthStats(p.year, p.month))),
  ])

  // 利用定着（簡易集計：利用率・入力率・未入力者数）
  const shiftMap = new Map<number, number[]>()
  shiftRows.forEach((s) => shiftMap.set(s.user_id, extractWorkDays(s.work_dates)))
  const enteredDaysByUser = new Map<number, Set<number>>()
  activityCountRows.forEach((r) => {
    const day = parseInt(r.date.slice(8, 10))
    if (!enteredDaysByUser.has(r.user_id)) enteredDaysByUser.set(r.user_id, new Set())
    enteredDaysByUser.get(r.user_id)!.add(day)
  })
  const lastUpdateMap = new Map<number, string>()
  ;[...activityLastRows, ...activationLastRows].forEach((r) => {
    const cur = lastUpdateMap.get(r.user_id)
    if (!cur || r.last_updated > cur) lastUpdateMap.set(r.user_id, r.last_updated)
  })
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month
  const upToDay = isCurrentMonth ? now.getDate() : 31
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  let activeCount = 0
  let noInputCount = 0
  let staleCount = 0
  const rates: number[] = []
  users.forEach((u) => {
    const plannedAll = shiftMap.get(u.id)
    const planned = plannedAll ? plannedAll.filter((d) => d <= upToDay) : null
    const entered = enteredDaysByUser.get(u.id) ?? new Set()
    const enteredCount = planned ? planned.filter((d) => entered.has(d)).length : 0
    if (enteredCount > 0) activeCount++
    if (planned && planned.length > 0) {
      rates.push(Math.round((enteredCount / planned.length) * 1000) / 10)
      if (enteredCount < planned.length) noInputCount++
    }
    const lastUpdatedAt = lastUpdateMap.get(u.id)
    const daysSince = lastUpdatedAt
      ? Math.floor((new Date(todayStr).getTime() - new Date(lastUpdatedAt.slice(0, 10)).getTime()) / 86400000)
      : null
    if (!lastUpdatedAt || (daysSince !== null && daysSince > 7)) staleCount++
  })
  const avgEntryRate = rates.length > 0 ? Math.round((rates.reduce((s, r) => s + r, 0) / rates.length) * 10) / 10 : null

  const past3Avg = {
    cancel: Math.round((past3Stats.reduce((s, m) => s + m.cancel, 0) / 3) * 10) / 10,
    activation: Math.round((past3Stats.reduce((s, m) => s + m.activation, 0) / 3) * 10) / 10,
  }

  return NextResponse.json({
    year, month,
    usage: {
      targetCount: users.length,
      activeCount,
      usageRate: users.length > 0 ? Math.round((activeCount / users.length) * 1000) / 10 : null,
      avgEntryRate,
      noInputCount,
      staleCount,
    },
    cases: {
      constructionUnconfirmed: constructionUnconfirmed?.count ?? 0,
      activationMissing: activationMissing?.count ?? 0,
      updateOverdue: updateOverdue?.count ?? 0,
      reviewPending: reviewPending?.count ?? 0,
    },
    monthly: {
      thisMonth,
      prevMonth: prevMonthStats,
      past3Avg,
      diffVsPrevMonth: { cancel: thisMonth.cancel - prevMonthStats.cancel, activation: thisMonth.activation - prevMonthStats.activation },
      diffVsPast3Avg: {
        cancel: Math.round((thisMonth.cancel - past3Avg.cancel) * 10) / 10,
        activation: Math.round((thisMonth.activation - past3Avg.activation) * 10) / 10,
      },
    },
  })
}
