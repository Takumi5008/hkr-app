import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

function extractWorkDays(workDatesJson: string): number[] {
  const raw = JSON.parse(workDatesJson ?? '[]')
  if (!Array.isArray(raw) || raw.length === 0) return []
  if (typeof raw[0] === 'number') return raw
  return raw.map((w: any) => w.day)
}

export interface EngagementRow {
  user_id: number
  name: string
  lastUpdatedAt: string | null
  entryRate: number | null // null = シフト未提出
  enteredCount: number
  plannedCount: number
  missingCount: number
  alert: boolean
  alertReasons: string[]
}

// 利用定着の可視化：最終更新日・当月入力率（シフト提出済み稼働予定日数に対する行動表記入日数）・未入力件数
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const isManager = session.role === 'manager' || session.role === 'admin' || session.role === 'viewer'
  if (!isManager) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))
  const dateLike = `${year}-${String(month).padStart(2, '0')}-%`
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month
  const upToDay = isCurrentMonth ? now.getDate() : 31

  const [users, shiftRows, activityCountRows, activityLastRows, activationLastRows] = await Promise.all([
    dbQuery<{ id: number; name: string }>(
      `SELECT id, name FROM users WHERE is_active = true AND role NOT IN ('viewer', 'shift_viewer') ORDER BY display_order, id`,
      []
    ),
    dbQuery<{ user_id: number; work_dates: string }>(
      `SELECT user_id, work_dates FROM shifts WHERE year = $1 AND month = $2 AND submitted = 1`,
      [year, month]
    ),
    dbQuery<{ user_id: number; day: string }>(
      `SELECT user_id, date FROM daily_activity WHERE date LIKE $1 AND work_hours IS NOT NULL AND work_hours != ''`,
      [dateLike]
    ).then((rows) => rows.map((r: any) => ({ user_id: r.user_id, day: r.date.slice(8, 10) }))),
    dbQuery<{ user_id: number; last_updated: string }>(
      `SELECT user_id, MAX(updated_at) AS last_updated FROM daily_activity WHERE updated_at != '' GROUP BY user_id`,
      []
    ),
    dbQuery<{ user_id: number; last_updated: string }>(
      `SELECT user_id, MAX(updated_at) AS last_updated FROM activation_records WHERE updated_at != '' GROUP BY user_id`,
      []
    ),
  ])

  const shiftMap = new Map<number, number[]>()
  shiftRows.forEach((s) => shiftMap.set(s.user_id, extractWorkDays(s.work_dates)))

  const enteredDaysByUser = new Map<number, Set<number>>()
  activityCountRows.forEach((r) => {
    if (!enteredDaysByUser.has(r.user_id)) enteredDaysByUser.set(r.user_id, new Set())
    enteredDaysByUser.get(r.user_id)!.add(parseInt(r.day))
  })

  const lastUpdateMap = new Map<number, string>()
  activityLastRows.forEach((r) => {
    const cur = lastUpdateMap.get(r.user_id)
    if (!cur || r.last_updated > cur) lastUpdateMap.set(r.user_id, r.last_updated)
  })
  activationLastRows.forEach((r) => {
    const cur = lastUpdateMap.get(r.user_id)
    if (!cur || r.last_updated > cur) lastUpdateMap.set(r.user_id, r.last_updated)
  })

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const members: EngagementRow[] = users.map((u) => {
    const plannedAll = shiftMap.get(u.id) ?? null
    const planned = plannedAll ? plannedAll.filter((d) => d <= upToDay) : null
    const entered = enteredDaysByUser.get(u.id) ?? new Set()
    const enteredCount = planned ? planned.filter((d) => entered.has(d)).length : 0
    const plannedCount = planned ? planned.length : 0
    const missingCount = planned ? planned.length - enteredCount : 0
    const entryRate = planned && planned.length > 0 ? Math.round((enteredCount / planned.length) * 1000) / 10 : null
    const lastUpdatedAt = lastUpdateMap.get(u.id) ?? null

    const alertReasons: string[] = []
    const daysSinceUpdate = lastUpdatedAt
      ? Math.floor((new Date(todayStr).getTime() - new Date(lastUpdatedAt.slice(0, 10)).getTime()) / 86400000)
      : null
    if (lastUpdatedAt === null || (daysSinceUpdate !== null && daysSinceUpdate > 7)) {
      alertReasons.push('最終更新から7日超')
    }
    if (missingCount >= 3) {
      alertReasons.push(`未入力${missingCount}件`)
    }

    return {
      user_id: u.id,
      name: u.name,
      lastUpdatedAt,
      entryRate,
      enteredCount,
      plannedCount,
      missingCount,
      alert: alertReasons.length > 0,
      alertReasons,
    }
  })

  const activeThisMonth = members.filter((m) => (m.enteredCount > 0)).length
  const ratesWithShift = members.filter((m) => m.entryRate !== null)
  const avgEntryRate = ratesWithShift.length > 0
    ? Math.round((ratesWithShift.reduce((s, m) => s + (m.entryRate ?? 0), 0) / ratesWithShift.length) * 10) / 10
    : null

  return NextResponse.json({
    year, month,
    members,
    summary: {
      targetCount: users.length,
      activeCount: activeThisMonth,
      usageRate: users.length > 0 ? Math.round((activeThisMonth / users.length) * 1000) / 10 : null,
      avgEntryRate,
      alertCount: members.filter((m) => m.alert).length,
    },
  })
}
