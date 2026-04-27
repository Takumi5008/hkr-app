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
            COALESCE(SUM(da.wimax + da.sonet), 0)::int AS weekly
     FROM users u
     LEFT JOIN daily_activity da ON da.user_id = u.id AND da.date >= $1 AND da.date <= $2
     GROUP BY u.id, u.name
     HAVING COALESCE(SUM(da.wimax + da.sonet), 0) > 0
     ORDER BY weekly DESC`,
    [from, to]
  )

  return NextResponse.json({ rows, from, to })
}
