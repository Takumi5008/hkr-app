import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '0')
  const month = parseInt(searchParams.get('month') ?? '0')
  if (!year || !month) return NextResponse.json({ error: 'year・month が必要です' }, { status: 400 })

  const isManager = session.role === 'manager' || session.role === 'admin'
  const userId = isManager && searchParams.get('userId')
    ? parseInt(searchParams.get('userId')!)
    : session.userId

  const rows = await dbQuery<{
    product: string
    cancel_count: number
    activation_count: number
  }>(
    `SELECT
       p.name AS product,
       COALESCE(COUNT(CASE WHEN ar.cancel = '○' THEN 1 END), 0)::int AS cancel_count,
       COALESCE(COUNT(CASE WHEN ar.activation = '○' THEN 1 END), 0)::int AS activation_count
     FROM products p
     LEFT JOIN activation_records ar ON (
       ar.user_id = $1 AND ar.year = $2 AND ar.month = $3
       AND (
         (p.activation_type = 'sonet' AND ar.type = 'sonet')
         OR (p.activation_type = 'wimax' AND ar.type IN ('wimax_direct', 'wimax_post'))
       )
     )
     WHERE p.activation_type IS NOT NULL
     GROUP BY p.name`,
    [userId, year, month]
  )

  return NextResponse.json(
    Object.fromEntries(rows.map((r) => [r.product, { cancel: r.cancel_count, activation: r.activation_count }]))
  )
}
