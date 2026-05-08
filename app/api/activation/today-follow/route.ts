import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export interface TodayFollowItem {
  name: string
  typeLabel: string
  fieldLabel: string
}

function todayFormats(y: number, m: number, d: number): string[] {
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return [
    `${y}-${mm}-${dd}`,
    `${y}/${mm}/${dd}`,
    `${m}/${d}`,
    `${mm}/${dd}`,
    `${m}月${d}日`,
  ]
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const y = parseInt(searchParams.get('y') ?? '0')
  const m = parseInt(searchParams.get('m') ?? '0')
  const d = parseInt(searchParams.get('d') ?? '0')
  if (!y || !m || !d) return NextResponse.json([])

  const formats = todayFormats(y, m, d)
  const ph = formats.map((_, i) => `$${i + 2}`).join(', ')

  const items: TodayFollowItem[] = []

  // So-net: 工事日当日
  const sonetRows = await dbQuery<{ name: string }>(
    `SELECT name FROM activation_records
     WHERE user_id = $1 AND type = 'sonet' AND construction_date IN (${ph})`,
    [session.userId, ...formats]
  )
  for (const r of sonetRows) items.push({ name: r.name, typeLabel: 'So-net', fieldLabel: '工事日当日' })

  // WiMAX直せち: 獲得後1週間後
  const directRows = await dbQuery<{ name: string }>(
    `SELECT name FROM activation_records
     WHERE user_id = $1 AND type = 'wimax_direct' AND week_after IN (${ph})`,
    [session.userId, ...formats]
  )
  for (const r of directRows) items.push({ name: r.name, typeLabel: 'WiMAX直せち', fieldLabel: '獲得後1週間後' })

  // WiMAX後送り: 受取日1週間後
  const postRows = await dbQuery<{ name: string }>(
    `SELECT name FROM activation_records
     WHERE user_id = $1 AND type = 'wimax_post' AND week_after_delivery IN (${ph})`,
    [session.userId, ...formats]
  )
  for (const r of postRows) items.push({ name: r.name, typeLabel: 'WiMAX後送り', fieldLabel: '受取日1週間後' })

  return NextResponse.json(items)
}
