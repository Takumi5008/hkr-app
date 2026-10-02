import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne, dbRun } from '@/lib/db'
import { toInt, toFloat } from '@/lib/parse'

type MonthRow = {
  member_name: string; year: number; month: number
  total_activation: number; total_cancel: number; opening_count: number
  work_days: number; work_hours: number
}

// 獲得数・開通数・解除数は開通表（activation_records）、稼働日数・稼働時間は行動表（daily_activity）から
// 集計して自動反映する（手入力は廃止）。
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'admin') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  const yearParam = searchParams.get('year')
  const year = yearParam ? Number(yearParam) : null

  if (!name) return NextResponse.json({ error: 'パラメータ不足' }, { status: 400 })

  const user = await dbQueryOne<{ id: number }>('SELECT id FROM users WHERE name = $1', [name])
  if (!user) return NextResponse.json([])

  const [arRows, daRows] = await Promise.all([
    // 開通表：獲得数＝全件数、解除数＝解除○、開通数＝開通○
    dbQuery<{ year: number; month: number; total_activation: number; total_cancel: number; opening_count: number }>(
      `SELECT year, month,
              COUNT(*)::int AS total_activation,
              COUNT(CASE WHEN cancel = '○' THEN 1 END)::int AS total_cancel,
              COUNT(CASE WHEN activation = '○' THEN 1 END)::int AS opening_count
       FROM activation_records
       WHERE user_id = $1 ${year ? 'AND year = $2' : ''}
       GROUP BY year, month`,
      year ? [user.id, year] : [user.id]
    ),
    // 行動表：稼働日数・稼働時間
    dbQuery<{ year: number; month: number; work_days: number; work_hours: number | null }>(
      `SELECT EXTRACT(YEAR FROM date::date)::int AS year,
              EXTRACT(MONTH FROM date::date)::int AS month,
              COUNT(CASE WHEN work_hours IS NOT NULL AND work_hours != '' THEN 1 END)::int AS work_days,
              ROUND(SUM(CASE WHEN TRANSLATE(work_hours,'０１２３４５６７８９。','0123456789.') ~ '^[0-9]+(\.[0-9]+)?$' THEN TRANSLATE(work_hours,'０１２３４５６７８９。','0123456789.')::numeric ELSE NULL END), 2) AS work_hours
       FROM daily_activity
       WHERE user_id = $1 ${year ? 'AND EXTRACT(YEAR FROM date::date) = $2' : ''}
       GROUP BY 1, 2`,
      year ? [user.id, year] : [user.id]
    ),
  ])

  const keyOf = (y: number, m: number) => `${y}-${m}`
  const map = new Map<string, MonthRow>()
  const emptyRow = (y: number, m: number): MonthRow => ({
    member_name: name, year: y, month: m,
    total_activation: 0, total_cancel: 0, opening_count: 0, work_days: 0, work_hours: 0,
  })

  arRows.forEach((r) => {
    map.set(keyOf(r.year, r.month), {
      ...emptyRow(r.year, r.month),
      total_activation: r.total_activation,
      total_cancel: r.total_cancel,
      opening_count: r.opening_count,
    })
  })
  daRows.forEach((r) => {
    const key = keyOf(r.year, r.month)
    const row = map.get(key) ?? emptyRow(r.year, r.month)
    row.work_days = r.work_days
    row.work_hours = r.work_hours ?? 0
    map.set(key, row)
  })

  const rows = [...map.values()].sort((a, b) => a.year - b.year || a.month - b.month)
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'admin') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { memberName, year, month, totalActivation, totalCancel, workDays, workHours, openingCount } = await req.json()

  const openingCountVal = (openingCount === '' || openingCount === null || openingCount === undefined)
    ? null : toInt(openingCount)

  await dbRun(
    `INSERT INTO member_monthly_stats (member_name, year, month, total_activation, total_cancel, work_days, work_hours, opening_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (member_name, year, month) DO UPDATE SET
       total_activation = EXCLUDED.total_activation,
       total_cancel     = EXCLUDED.total_cancel,
       work_days        = EXCLUDED.work_days,
       work_hours       = EXCLUDED.work_hours,
       opening_count    = EXCLUDED.opening_count`,
    [memberName, year, month, toInt(totalActivation), toInt(totalCancel), toInt(workDays), toFloat(workHours), openingCountVal]
  )

  const rows = await dbQuery(
    'SELECT * FROM member_monthly_stats WHERE member_name=$1 AND year=$2 ORDER BY month ASC',
    [memberName, year]
  )
  return NextResponse.json(rows)
}
