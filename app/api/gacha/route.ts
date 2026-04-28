import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne, dbRun } from '@/lib/db'
import { syncUserPoints } from '@/lib/points'

const GACHA_COST = 200

const RARITY_LABEL: Record<string, string> = {
  common: 'コモン',
  rare: 'レア',
  epic: 'エピック',
  legendary: 'レジェンダリー',
}

const RARITY_COLOR: Record<string, string> = {
  common: 'text-gray-600 bg-gray-100',
  rare: 'text-blue-600 bg-blue-100',
  epic: 'text-purple-600 bg-purple-100',
  legendary: 'text-yellow-600 bg-yellow-100',
}

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const items = await dbQuery(
    `SELECT id, name, description, gacha_rarity, gacha_weight FROM point_items WHERE is_gacha = true AND is_active = true ORDER BY gacha_weight DESC`
  )
  return NextResponse.json({ items, cost: GACHA_COST, rarityLabel: RARITY_LABEL, rarityColor: RARITY_COLOR })
}

export async function POST() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const userId = session.userId
  const user = await dbQueryOne('SELECT points FROM users WHERE id = $1', [userId])
  const currentPoints = (user as any)?.points ?? 0

  if (currentPoints < GACHA_COST) {
    return NextResponse.json({ error: `ポイントが不足しています（必要: ${GACHA_COST}pt）` }, { status: 400 })
  }

  const items = await dbQuery(
    `SELECT id, name, description, gacha_rarity, gacha_weight FROM point_items WHERE is_gacha = true AND is_active = true`
  )
  if (items.length === 0) return NextResponse.json({ error: 'ガチャアイテムがありません' }, { status: 400 })

  // 重み付きランダム選択
  const totalWeight = items.reduce((s: number, item: any) => s + (item.gacha_weight ?? 10), 0)
  let rand = Math.random() * totalWeight
  let selected = items[items.length - 1]
  for (const item of items) {
    rand -= item.gacha_weight ?? 10
    if (rand <= 0) { selected = item; break }
  }

  // ポイント消費
  await dbRun(
    `INSERT INTO point_transactions (user_id, delta, reason, ref_type, ref_id)
     VALUES ($1, $2, $3, 'gacha', $4)
     ON CONFLICT (user_id, ref_type, ref_id) DO NOTHING`,
    [userId, -GACHA_COST, `ガチャ: ${selected.name}`, `gacha-${Date.now()}`]
  )
  await syncUserPoints(userId)

  // 交換履歴に記録
  await dbRun(
    `INSERT INTO point_exchanges (user_id, item_id, item_name, cost, status) VALUES ($1, $2, $3, $4, 'gacha')`,
    [userId, selected.id, selected.name, GACHA_COST]
  )

  const updated = await dbQueryOne('SELECT points FROM users WHERE id = $1', [userId])
  return NextResponse.json({
    ok: true,
    item: selected,
    rarityLabel: RARITY_LABEL[selected.gacha_rarity] ?? 'コモン',
    rarityColor: RARITY_COLOR[selected.gacha_rarity] ?? RARITY_COLOR.common,
    newPoints: (updated as any)?.points ?? 0,
    cost: GACHA_COST,
  })
}
