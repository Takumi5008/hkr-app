import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const isAdmin = session.role === 'admin' || session.role === 'manager'
  if (!isAdmin) return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') ?? 'タカハシ'
  const year = parseInt(searchParams.get('year') ?? '2026')
  const month = parseInt(searchParams.get('month') ?? '5')
  const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : null

  const activations = await dbQuery(
    `SELECT id, user_id, type, name, date, delivery_date, delivery_date_done,
            year, month, activation, cancel, construction_date
     FROM activation_records
     WHERE name ILIKE $1
     ORDER BY id DESC`,
    [`%${name}%`]
  )

  const calendar = await dbQuery(
    `SELECT id, user_id, activation_record_id, year, month, activation_date,
            customer_name, line_type, status, created_at
     FROM opening_calendar
     WHERE customer_name ILIKE $1
     ORDER BY id DESC`,
    [`%${name}%`]
  )

  // records テーブルの内容（HKRデータ入力の保存済みデータ）
  const records = await dbQuery(
    `SELECT r.user_id, r.year, r.month, r.product, r.cancel_count, r.activation_count,
            r.remaining_opening, r.expected_opening, r.confirmed_opening, r.updated_at,
            u.name as user_name
     FROM records r
     JOIN users u ON u.id = r.user_id
     WHERE r.year = $1 AND r.month = $2
     ${userId ? 'AND r.user_id = $3' : ''}
     ORDER BY r.user_id, r.product`,
    userId ? [year, month, userId] : [year, month]
  )

  // suggest クエリの結果（開通表実績の元データ）
  const targetUserId = userId ?? session.userId
  const suggest = await dbQuery(
    `SELECT
       p.name AS product,
       p.activation_type,
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
     GROUP BY p.name, p.activation_type`,
    [targetUserId, year, month]
  )

  return NextResponse.json({ activations, calendar, records, suggest, targetUserId, year, month })
}
