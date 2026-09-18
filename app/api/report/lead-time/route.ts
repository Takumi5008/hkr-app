import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

const LEAD_TIME_LABELS: Record<string, string> = {
  sonet: 'So-net',
  nifty: '@nifty光',
  sbhikari: 'SB光',
  wimax_post: 'WiMAX後送り',
  wimax_direct: 'WiMAX直せち',
  sbair_post: 'SBAir後送り',
  sbair_direct: 'SBAir直せち',
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const isManager = session.role === 'manager' || session.role === 'admin' || session.role === 'viewer'
  if (!isManager) return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const monthParam = searchParams.get('month')
  const userIdParam = searchParams.get('userId')

  // 年・月は両方揃っている場合のみ絞り込む（片方だけの指定は全期間扱い）
  const year = yearParam && monthParam ? parseInt(yearParam) : null
  const month = yearParam && monthParam ? parseInt(monthParam) : null
  const userId = userIdParam ? parseInt(userIdParam) : null

  const conditions = [
    `ar.date ~ '^\\d{4}-\\d{2}-\\d{2}$'`,
    `oc.activation_date ~ '^\\d{4}-\\d{2}-\\d{2}$'`,
    `oc.activation_date::date >= ar.date::date`,
  ]
  const params: number[] = []
  if (year !== null && month !== null && !Number.isNaN(year) && !Number.isNaN(month)) {
    params.push(year, month)
    conditions.push(`ar.year = $${params.length - 1}`, `ar.month = $${params.length}`)
  }
  if (userId !== null && !Number.isNaN(userId)) {
    params.push(userId)
    conditions.push(`ar.user_id = $${params.length}`)
  }

  const leadTimeRows = await dbQuery<{ type: string; cnt: number; avg_days: number }>(
    `SELECT ar.type,
            COUNT(*)::int AS cnt,
            AVG(oc.activation_date::date - ar.date::date)::float AS avg_days
     FROM activation_records ar
     JOIN opening_calendar oc ON oc.activation_record_id = ar.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY ar.type`,
    params
  )

  const leadTimeByType = leadTimeRows.map(r => ({
    type: r.type,
    label: LEAD_TIME_LABELS[r.type] ?? r.type,
    avgDays: Math.round(r.avg_days * 10) / 10,
    count: r.cnt,
  }))
  const totalCount = leadTimeRows.reduce((s, r) => s + r.cnt, 0)
  const leadTimeOverall = totalCount > 0
    ? {
        avgDays: Math.round((leadTimeRows.reduce((s, r) => s + r.avg_days * r.cnt, 0) / totalCount) * 10) / 10,
        count: totalCount,
      }
    : null

  return NextResponse.json({ leadTimeByType, leadTimeOverall })
}
