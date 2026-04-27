import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const rows = await dbQuery(
    `SELECT u.name,
            COALESCE(SUM(r.activation_count), 0)::int AS activation,
            MAX(r.updated_at) AS last_updated
     FROM records r
     JOIN users u ON u.id = r.user_id
     WHERE r.updated_at LIKE $1 AND r.activation_count > 0
     GROUP BY u.id, u.name
     ORDER BY last_updated DESC`,
    [`${today}%`]
  )

  return NextResponse.json(rows)
}
