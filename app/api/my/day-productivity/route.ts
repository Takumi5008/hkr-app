import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

// 指定した年月の直前 N ヶ月（当月は含まない）を、古い順で返す
function pastMonths(year: number, month: number, count: number): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = []
  let y = year
  let m = month
  for (let i = 0; i < count; i++) {
    m -= 1
    if (m === 0) { m = 12; y -= 1 }
    result.unshift({ year: y, month: m })
  }
  return result
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const count = Math.min(12, Math.max(1, parseInt(searchParams.get('months') ?? '3')))

  // マネージャー・管理者・閲覧者は他メンバーの実績も参照可能
  const isManager = session.role === 'manager' || session.role === 'admin' || session.role === 'viewer'
  const userIdParam = searchParams.get('userId')
  const targetUserId = isManager && userIdParam ? parseInt(userIdParam) : session.userId

  const targets = pastMonths(year, month, count)

  const [rows, arRows] = await Promise.all([
    dbQuery<{ y: number; m: number; cancel: number; work_days: number }>(
      `SELECT EXTRACT(YEAR FROM date::date)::int AS y,
              EXTRACT(MONTH FROM date::date)::int AS m,
              COALESCE(SUM(cancel), 0)::int AS cancel,
              COUNT(CASE WHEN work_hours IS NOT NULL AND work_hours != '' THEN 1 END)::int AS work_days
       FROM daily_activity
       WHERE user_id = $1
         AND (${targets.map((_, i) => `(EXTRACT(YEAR FROM date::date) = $${i * 2 + 2} AND EXTRACT(MONTH FROM date::date) = $${i * 2 + 3})`).join(' OR ')})
       GROUP BY y, m`,
      [targetUserId, ...targets.flatMap((t) => [t.year, t.month])]
    ),
    // 開通表（activation_records）: 開通数は year/month 列をそのまま使える
    dbQuery<{ y: number; m: number; activation_count: number }>(
      `SELECT year AS y, month AS m, COUNT(CASE WHEN activation = '○' THEN 1 END)::int AS activation_count
       FROM activation_records
       WHERE user_id = $1
         AND (${targets.map((_, i) => `(year = $${i * 2 + 2} AND month = $${i * 2 + 3})`).join(' OR ')})
       GROUP BY year, month`,
      [targetUserId, ...targets.flatMap((t) => [t.year, t.month])]
    ),
  ])

  const rowMap = new Map(rows.map((r) => [`${r.y}-${r.m}`, r]))
  const arMap = new Map(arRows.map((r) => [`${r.y}-${r.m}`, r]))
  const months = targets.map((t) => {
    const key = `${t.year}-${t.month}`
    const r = rowMap.get(key)
    const ar = arMap.get(key)
    const cancel = r?.cancel ?? 0
    const workDays = r?.work_days ?? 0
    const activationCount = ar?.activation_count ?? 0
    const dayProductivity = workDays > 0 ? Math.round((cancel / workDays) * 100) / 100 : null
    const activationDayProductivity = workDays > 0 ? Math.round((activationCount / workDays) * 100) / 100 : null
    const openingRate = cancel > 0 ? Math.round((activationCount / cancel) * 1000) / 10 : null
    return { year: t.year, month: t.month, cancel, activationCount, workDays, dayProductivity, activationDayProductivity, openingRate }
  })

  const validMonths = months.filter((m) => m.workDays > 0)
  const totalCancel = validMonths.reduce((s, m) => s + m.cancel, 0)
  const totalActivation = validMonths.reduce((s, m) => s + m.activationCount, 0)
  const totalWorkDays = validMonths.reduce((s, m) => s + m.workDays, 0)
  const avgDayProductivity = totalWorkDays > 0 ? Math.round((totalCancel / totalWorkDays) * 100) / 100 : null
  const avgActivationDayProductivity = totalWorkDays > 0 ? Math.round((totalActivation / totalWorkDays) * 100) / 100 : null
  const avgOpeningRate = totalCancel > 0 ? Math.round((totalActivation / totalCancel) * 1000) / 10 : null

  return NextResponse.json({
    months,
    avgDayProductivity,
    avgActivationDayProductivity,
    avgOpeningRate,
  })
}
