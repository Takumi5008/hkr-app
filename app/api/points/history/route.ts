import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  // 月別開通数＝ポイント付加履歴
  const rows = await dbQuery(
    `SELECT year, month,
            COALESCE(SUM(activation_count), 0)::int AS activation,
            COALESCE(SUM(activation_count), 0)::int * 10 AS points_earned
     FROM records
     WHERE user_id = $1
     GROUP BY year, month
     ORDER BY year DESC, month DESC`,
    [session.userId]
  )
  return NextResponse.json(rows)
}
