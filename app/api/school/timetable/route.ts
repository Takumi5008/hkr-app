import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const rows = await dbQuery(
    `SELECT day_of_week, period, subject FROM school_timetable WHERE user_id=$1`,
    [session.userId]
  )
  return NextResponse.json(rows)
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { day_of_week, period, subject } = await req.json()
  if (!day_of_week || !period) return NextResponse.json({ error: 'パラメータ不足' }, { status: 400 })

  await dbRun(
    `INSERT INTO school_timetable (user_id, day_of_week, period, subject)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, day_of_week, period) DO UPDATE SET subject=$4`,
    [session.userId, day_of_week, period, subject ?? '']
  )

  const rows = await dbQuery(
    `SELECT day_of_week, period, subject FROM school_timetable WHERE user_id=$1`,
    [session.userId]
  )
  return NextResponse.json(rows)
}
