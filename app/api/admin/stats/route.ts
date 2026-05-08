import { NextResponse } from 'next/server'
import { dbQuery, dbQueryOne } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [users, roleCounts, dailyLogins] = await Promise.all([
    dbQuery(
      `SELECT id, name, email, role, created_at, login_count, last_login_at, login_streak
       FROM users ORDER BY created_at ASC`
    ),
    dbQuery(
      `SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role`
    ),
    dbQuery(
      `SELECT date, COUNT(*) as count
       FROM login_days
       WHERE date >= TO_CHAR(NOW() - INTERVAL '30 days', 'YYYY-MM-DD')
       GROUP BY date ORDER BY date DESC`
    ),
  ])

  const totalUsers = users.length
  const totalLogins = users.reduce((s: number, u: any) => s + (u.login_count ?? 0), 0)

  return NextResponse.json({ users, roleCounts, dailyLogins, totalUsers, totalLogins })
}
