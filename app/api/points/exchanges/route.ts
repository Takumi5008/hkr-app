import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun, dbQueryOne } from '@/lib/db'

// 自分の交換履歴 or 管理者は全員
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const isManager = session.role === 'manager' || session.role === 'viewer'
  if (isManager) {
    const rows = await dbQuery(
      `SELECT pe.*, u.name AS user_name, u.avatar AS user_avatar
       FROM point_exchanges pe
       JOIN users u ON u.id = pe.user_id
       ORDER BY pe.created_at DESC`
    )
    return NextResponse.json(rows)
  }
  const rows = await dbQuery(
    `SELECT * FROM point_exchanges WHERE user_id = $1 ORDER BY created_at DESC`,
    [session.userId]
  )
  return NextResponse.json(rows)
}

// 交換申請（即時ポイント消費）
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { itemId } = await req.json()
  const item = await dbQueryOne('SELECT * FROM point_items WHERE id = $1 AND is_active = true', [itemId])
  if (!item) return NextResponse.json({ error: 'アイテムが見つかりません' }, { status: 404 })

  const user = await dbQueryOne('SELECT points FROM users WHERE id = $1', [session.userId])
  const currentPoints: number = (user as any)?.points ?? 0
  const cost: number = (item as any).cost

  if (currentPoints < cost) {
    return NextResponse.json({ error: 'ポイントが不足しています' }, { status: 400 })
  }

  await dbRun('UPDATE users SET points = points - $1 WHERE id = $2', [cost, session.userId])
  await dbRun(
    `INSERT INTO point_exchanges (user_id, item_id, item_name, cost, status) VALUES ($1, $2, $3, $4, 'pending')`,
    [session.userId, (item as any).id, (item as any).name, cost]
  )

  const updated = await dbQueryOne('SELECT points FROM users WHERE id = $1', [session.userId])
  return NextResponse.json({ newPoints: (updated as any)?.points ?? 0 })
}

// 管理者がステータス更新
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const { id, status } = await req.json()
  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: '不正なステータス' }, { status: 400 })
  }

  // reject の場合はポイントを返還
  if (status === 'rejected') {
    const exchange = await dbQueryOne('SELECT * FROM point_exchanges WHERE id = $1', [id])
    if (exchange && (exchange as any).status === 'pending') {
      await dbRun('UPDATE users SET points = points + $1 WHERE id = $2', [(exchange as any).cost, (exchange as any).user_id])
    }
  }

  await dbRun('UPDATE point_exchanges SET status = $1 WHERE id = $2', [status, id])
  return NextResponse.json({ ok: true })
}
