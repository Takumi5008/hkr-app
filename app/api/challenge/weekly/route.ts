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
    `SELECT u.id, u.name,
            COALESCE(ar.cnt, 0) + COALESCE(oc.cnt, 0) AS weekly
     FROM users u
     LEFT JOIN (
       SELECT user_id, COUNT(*)::int AS cnt FROM activation_records
       WHERE activation = '○' AND created_at::date >= $1::date AND created_at::date <= $2::date
       GROUP BY user_id
     ) ar ON ar.user_id = u.id
     LEFT JOIN (
       SELECT user_id, COUNT(*)::int AS cnt FROM opening_calendar
       WHERE status = '○' AND created_at::date >= $1::date AND created_at::date <= $2::date
       GROUP BY user_id
     ) oc ON oc.user_id = u.id
     WHERE COALESCE(ar.cnt, 0) + COALESCE(oc.cnt, 0) > 0
     ORDER BY weekly DESC`,
    [from, to]
  )

  return NextResponse.json({ rows, from, to })
}
