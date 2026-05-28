import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne, dbRun } from '@/lib/db'
import { addPointTransaction } from '@/lib/points'

function getFridays(weeks = 8): string[] {
  const fridays: string[] = []
  const d = new Date()
  const diff = (5 - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  for (let i = 0; i < weeks; i++) {
    fridays.push(new Date(d).toISOString().slice(0, 10))
    d.setDate(d.getDate() + 7)
  }
  return fridays
}

function getFridaysForMonth(year: number, month: number): string[] {
  const fridays: string[] = []
  const d = new Date(year, month - 1, 1)
  const daysUntilFriday = (5 - d.getDay() + 7) % 7
  d.setDate(1 + daysUntilFriday)
  while (d.getMonth() === month - 1) {
    fridays.push(`${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    d.setDate(d.getDate() + 7)
  }
  return fridays
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const monthParam = searchParams.get('month')
  let dates: string[]
  if (yearParam && monthParam) {
    dates = getFridaysForMonth(parseInt(yearParam), parseInt(monthParam))
  } else {
    dates = getFridays(8)
  }
  const rows = await dbQuery(
    `SELECT * FROM mtg_attendance WHERE user_id = $1 AND date = ANY($2)`,
    [session.userId, dates]
  )
  const map: Record<string, any> = {}
  rows.forEach((r) => { map[r.date] = r })
  return NextResponse.json(map)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { date, status, reason, lateTime } = await req.json()
  if (!date || !['present', 'absent', 'late'].includes(status)) {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }
  const deadlineRow = await dbQuery('SELECT * FROM mtg_deadlines WHERE date = $1', [date])
  if (deadlineRow[0]?.deadline_at && new Date(deadlineRow[0].deadline_at) < new Date()) {
    return NextResponse.json({ error: '入力期限が終了しています' }, { status: 403 })
  }
  await dbRun(
    `INSERT INTO mtg_attendance (user_id, date, status, reason, late_time, updated_at)
     VALUES ($1, $2, $3, $4, $5, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
     ON CONFLICT (user_id, date) DO UPDATE SET status = $3, reason = $4, late_time = $5, updated_at = TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
    [session.userId, date, status, reason ?? '', lateTime ?? '']
  )

  // 期限内に提出完了したら +1pt（日付ごとに1回のみ）
  await addPointTransaction(
    session.userId as number, 1, 'MTG出欠時間内提出', 'mtg_submit', date
  )

  return NextResponse.json({ ok: true })
}
