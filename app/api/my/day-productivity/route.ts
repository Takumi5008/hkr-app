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

  const targets = pastMonths(year, month, count)

  const rows = await dbQuery<{ y: number; m: number; cancel: number; work_days: number }>(
    `SELECT EXTRACT(YEAR FROM date::date)::int AS y,
            EXTRACT(MONTH FROM date::date)::int AS m,
            COALESCE(SUM(cancel), 0)::int AS cancel,
            COUNT(CASE WHEN work_hours IS NOT NULL AND work_hours != '' THEN 1 END)::int AS work_days
     FROM daily_activity
     WHERE user_id = $1
       AND (${targets.map((_, i) => `(EXTRACT(YEAR FROM date::date) = $${i * 2 + 2} AND EXTRACT(MONTH FROM date::date) = $${i * 2 + 3})`).join(' OR ')})
     GROUP BY y, m`,
    [session.userId, ...targets.flatMap((t) => [t.year, t.month])]
  )

  const rowMap = new Map(rows.map((r) => [`${r.y}-${r.m}`, r]))
  const months = targets.map((t) => {
    const r = rowMap.get(`${t.year}-${t.month}`)
    const cancel = r?.cancel ?? 0
    const workDays = r?.work_days ?? 0
    const dayProductivity = workDays > 0 ? Math.round((cancel / workDays) * 100) / 100 : null
    return { year: t.year, month: t.month, cancel, workDays, dayProductivity }
  })

  const validMonths = months.filter((m) => m.workDays > 0)
  const totalCancel = validMonths.reduce((s, m) => s + m.cancel, 0)
  const totalWorkDays = validMonths.reduce((s, m) => s + m.workDays, 0)
  const avgDayProductivity = totalWorkDays > 0 ? Math.round((totalCancel / totalWorkDays) * 100) / 100 : null

  return NextResponse.json({ months, avgDayProductivity })
}
