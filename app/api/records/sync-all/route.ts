import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'admin') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const { year, month } = await req.json()
  if (!year || !month) return NextResponse.json({ error: 'year・month が必要です' }, { status: 400 })

  // activation_type が設定された商材一覧
  const products = await dbQuery<{ name: string; activation_type: string }>(
    `SELECT name, activation_type FROM products WHERE activation_type IS NOT NULL ORDER BY sort_order, id`,
    []
  )
  if (products.length === 0) return NextResponse.json({ updated: 0 })

  // アクティブなメンバー（viewer 以外）
  const users = await dbQuery<{ id: number }>(
    `SELECT id FROM users WHERE is_active = true AND role NOT IN ('viewer', 'shift_viewer') ORDER BY id`,
    []
  )

  let updated = 0

  for (const user of users) {
    for (const product of products) {
      const types = product.activation_type === 'sonet'
        ? ["'sonet'"]
        : ["'wimax_direct'", "'wimax_post'"]

      const rows = await dbQuery<{ cancel_count: number; activation_count: number }>(
        `SELECT
           COUNT(CASE WHEN cancel = '○' THEN 1 END)::int AS cancel_count,
           COUNT(CASE WHEN activation = '○' THEN 1 END)::int AS activation_count
         FROM activation_records
         WHERE user_id = $1 AND year = $2 AND month = $3
           AND type IN (${types.join(',')})`,
        [user.id, year, month]
      )

      const { cancel_count, activation_count } = rows[0] ?? { cancel_count: 0, activation_count: 0 }

      // 既存 records の remaining/expected を保持しつつ cancel/activation を更新
      await dbRun(
        `INSERT INTO records (user_id, year, month, product, cancel_count, activation_count, remaining_opening, expected_opening, confirmed_opening, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 0, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
         ON CONFLICT (user_id, year, month, product) DO UPDATE SET
           cancel_count     = EXCLUDED.cancel_count,
           activation_count = EXCLUDED.activation_count,
           updated_at       = EXCLUDED.updated_at`,
        [user.id, year, month, product.name, cancel_count, activation_count]
      )
      updated++
    }
  }

  return NextResponse.json({ updated })
}
