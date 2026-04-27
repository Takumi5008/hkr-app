import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQueryOne, dbRun } from '@/lib/db'
import { addPointTransaction } from '@/lib/points'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')
  if (!year || !month) return NextResponse.json({ error: 'year と month を指定してください' }, { status: 400 })
  const shift = await dbQueryOne('SELECT * FROM shifts WHERE user_id = $1 AND year = $2 AND month = $3', [session.userId, year, month])
  return NextResponse.json({
    workDates: shift ? JSON.parse(shift.work_dates) : [],
    submitted: shift ? !!shift.submitted : false,
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { year, month, workDates, submitted } = await req.json()
  if (!year || !month || !Array.isArray(workDates)) return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  if (session.role !== 'manager') {
    const deadline = await dbQueryOne('SELECT * FROM shift_deadlines WHERE year = $1 AND month = $2', [year, month])
    if (deadline?.deadline_at && new Date(deadline.deadline_at) < new Date()) {
      return NextResponse.json({ error: '提出期限が終了しています' }, { status: 403 })
    }
  }
  await dbRun(
    `INSERT INTO shifts (user_id, year, month, work_dates, submitted, updated_at)
     VALUES ($1, $2, $3, $4, $5, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
     ON CONFLICT (user_id, year, month) DO UPDATE SET work_dates = $4, submitted = $5, updated_at = TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
    [session.userId, year, month, JSON.stringify(workDates), submitted ? 1 : 0]
  )

  // 期限内に提出完了したら +1pt（月ごとに1回のみ）
  if (submitted) {
    await addPointTransaction(
      session.userId as number, 1, 'シフト時間内提出', 'shift_submit', `${year}-${month}`
    )
  }

  return NextResponse.json({ ok: true })
}
