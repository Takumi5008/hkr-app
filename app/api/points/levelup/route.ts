import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbTransaction, dbQuery } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const rows = await dbQuery(
    `SELECT delta, reason, created_at FROM point_transactions
     WHERE user_id = $1 AND ref_type = 'levelup'
     ORDER BY created_at DESC LIMIT 20`,
    [session.userId]
  )
  return NextResponse.json(rows)
}

export async function POST() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  let newLevel = 0
  let newPoints = 0

  try {
    await dbTransaction(async (client) => {
      const { rows } = await client.query(
        'SELECT level, points FROM users WHERE id = $1 FOR UPDATE',
        [session.userId]
      )
      const user = rows[0]
      if (!user) throw new Error('ユーザーが見つかりません')
      if (user.level >= 100) throw new Error('最大レベルに達しています')

      const cost = 100 * (user.level + 1)
      if (user.points < cost) throw new Error(`ポイントが不足しています（必要: ${cost}pt、現在: ${user.points}pt）`)

      await client.query(
        `INSERT INTO point_transactions (user_id, delta, reason, ref_type, ref_id)
         VALUES ($1, $2, $3, 'levelup', $4)`,
        [session.userId, -cost, `Lv.${user.level}→Lv.${user.level + 1} レベルアップ`, `lv${user.level + 1}-${Date.now()}`]
      )

      const result = await client.query(
        'UPDATE users SET level = level + 1, points = points - $1 WHERE id = $2 RETURNING level, points',
        [cost, session.userId]
      )
      newLevel = result.rows[0].level
      newPoints = result.rows[0].points
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  return NextResponse.json({ level: newLevel, points: newPoints })
}
