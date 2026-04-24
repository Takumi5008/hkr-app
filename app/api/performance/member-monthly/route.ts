import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')
  const year = searchParams.get('year')

  if (!name) return NextResponse.json({ error: 'パラメータ不足' }, { status: 400 })

  const rows = year
    ? await dbQuery(
        'SELECT * FROM member_monthly_stats WHERE member_name=$1 AND year=$2 ORDER BY year ASC, month ASC',
        [name, Number(year)]
      )
    : await dbQuery(
        'SELECT * FROM member_monthly_stats WHERE member_name=$1 ORDER BY year ASC, month ASC',
        [name]
      )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { memberName, year, month, totalActivation, totalCancel, workDays } = await req.json()

  await dbRun(
    `INSERT INTO member_monthly_stats (member_name, year, month, total_activation, total_cancel, work_days)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (member_name, year, month) DO UPDATE SET
       total_activation = EXCLUDED.total_activation,
       total_cancel     = EXCLUDED.total_cancel,
       work_days        = EXCLUDED.work_days`,
    [memberName, year, month, totalActivation ?? 0, totalCancel ?? 0, workDays ?? 0]
  )

  const rows = await dbQuery(
    'SELECT * FROM member_monthly_stats WHERE member_name=$1 AND year=$2 ORDER BY month ASC',
    [memberName, year]
  )
  return NextResponse.json(rows)
}
