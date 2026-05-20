import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const rows = await dbQuery(
    `SELECT u.name,
            COALESCE(SUM(d.delta), 0)::int AS activation,
            MAX(d.created_at) AS last_updated
     FROM daily_activation_log d
     JOIN users u ON u.id = d.user_id
     WHERE d.date = $1 AND d.delta > 0
     GROUP BY u.id, u.name
     ORDER BY last_updated DESC`,
    [today]
  )

  return NextResponse.json(rows)
}
