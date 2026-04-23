import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  let schedules
  if (year && month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    schedules = await dbQuery(
      "SELECT * FROM schedules WHERE user_id = $1 AND date LIKE $2 ORDER BY date ASC, start_time ASC NULLS LAST",
      [session.userId, `${prefix}%`]
    )
  } else {
    schedules = await dbQuery(
      'SELECT * FROM schedules WHERE user_id = $1 ORDER BY date ASC, start_time ASC NULLS LAST',
      [session.userId]
    )
  }
  return NextResponse.json(schedules)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { title, date, startTime, endTime, memo } = await req.json()
  if (!title?.trim() || !date) return NextResponse.json({ error: 'タイトルと日付を入力してください' }, { status: 400 })
  const result = await dbRun(
    `INSERT INTO schedules (user_id, title, date, start_time, end_time, memo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [session.userId, title.trim(), date, startTime || null, endTime || null, memo || '']
  )
  const schedule = await dbQuery('SELECT * FROM schedules WHERE id = $1', [result.id])
  return NextResponse.json(schedule[0])
}
