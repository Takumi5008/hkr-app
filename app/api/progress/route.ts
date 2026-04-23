import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  const [progress, records] = await Promise.all([
    dbQuery('SELECT * FROM monthly_progress WHERE user_id = $1 AND year = $2 AND month = $3', [session.userId, year, month]),
    dbQuery('SELECT SUM(cancel_count) as total FROM records WHERE user_id = $1 AND year = $2 AND month = $3', [session.userId, year, month]),
  ])

  return NextResponse.json({
    cancelTarget: progress[0]?.cancel_target ?? 0,
    workDates: JSON.parse(progress[0]?.work_dates ?? '[]'),
    actualCancel: parseInt(records[0]?.total ?? '0'),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { year, month, cancelTarget, workDates } = await req.json()
  await dbRun(
    `INSERT INTO monthly_progress (user_id, year, month, cancel_target, work_dates)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, year, month) DO UPDATE SET cancel_target = $4, work_dates = $5`,
    [session.userId, year, month, cancelTarget, JSON.stringify(workDates)]
  )
  return NextResponse.json({ ok: true })
}
