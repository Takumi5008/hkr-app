import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  try {
    const rows = await dbQuery(
      `SELECT u.id, u.name, COUNT(oc.id)::int AS activation
       FROM users u
       JOIN opening_calendar oc ON oc.user_id = u.id
       WHERE oc.year = $1 AND oc.month = $2 AND oc.status = '○'
       GROUP BY u.id, u.name
       ORDER BY activation DESC`,
      [year, month]
    )
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
