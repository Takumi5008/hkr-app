import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const rows = await dbQuery(
    `SELECT * FROM school_events WHERE user_id=$1 ORDER BY event_date ASC, created_at ASC`,
    [session.userId]
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { type, subject, event_date, memo } = await req.json()
  if (!type || !subject || !event_date) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const result = await dbRun(
    `INSERT INTO school_events (user_id, type, subject, event_date, memo)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [session.userId, type, subject, event_date, memo ?? '']
  )

  const rows = await dbQuery(
    `SELECT * FROM school_events WHERE user_id=$1 ORDER BY event_date ASC, created_at ASC`,
    [session.userId]
  )
  return NextResponse.json(rows)
}
