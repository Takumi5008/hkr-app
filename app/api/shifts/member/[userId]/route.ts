import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQueryOne, dbRun } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const { userId } = await params
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')
  const shift = await dbQueryOne('SELECT * FROM shifts WHERE user_id = $1 AND year = $2 AND month = $3', [userId, year, month])
  return NextResponse.json({
    workDates: shift ? JSON.parse(shift.work_dates) : [],
    submitted: shift ? !!shift.submitted : false,
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const { userId } = await params
  const { year, month, workDates, submitted } = await req.json()
  await dbRun(
    `INSERT INTO shifts (user_id, year, month, work_dates, submitted, updated_at)
     VALUES ($1, $2, $3, $4, $5, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
     ON CONFLICT (user_id, year, month) DO UPDATE SET work_dates = $4, submitted = $5, updated_at = TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
    [userId, year, month, JSON.stringify(workDates), submitted ? 1 : 0]
  )
  return NextResponse.json({ ok: true })
}
