import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const now = new Date()
  const day = now.getDay() // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const from = fmt(monday)
  const to = fmt(sunday)

  const rows = await dbQuery(
    `SELECT u.id, u.name, COUNT(oc.id)::int AS weekly
     FROM users u
     JOIN opening_calendar oc ON oc.user_id = u.id
     WHERE oc.status = '○'
       AND oc.activation_date ~ E'^\\d{1,2}/\\d{1,2}$'
       AND MAKE_DATE(
             oc.year,
             SPLIT_PART(oc.activation_date, '/', 1)::int,
             SPLIT_PART(oc.activation_date, '/', 2)::int
           ) BETWEEN $1::date AND $2::date
     GROUP BY u.id, u.name
     ORDER BY weekly DESC`,
    [from, to]
  )

  return NextResponse.json({ rows, from, to })
}
