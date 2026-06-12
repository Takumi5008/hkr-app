import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export interface TodayFollowItem {
  name: string
  typeLabel: string
  fieldLabel: string
  kind?: 'follow' | 'cancel'
  cancelReason?: string
}

function todayFormats(y: number, m: number, d: number): string[] {
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return [
    `${y}-${mm}-${dd}`,
    `${y}/${mm}/${dd}`,
    `${y}/${m}/${d}`,
    `${m}/${d}`,
    `${mm}/${dd}`,
    `${m}月${d}日`,
    `${mm}月${dd}日`,
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

  // So-net: 工事日当日（開通❌除外）
  const sonetRows = await dbQuery<{ name: string }>(
    `SELECT name FROM activation_records
     WHERE user_id = $1 AND type = 'sonet' AND construction_date IN (${ph}) AND (activation IS NULL OR activation != '×')`,
    [session.userId, ...formats]
  )
  for (const r of sonetRows) items.push({ name: r.name, typeLabel: 'So-net', fieldLabel: '工事日当日' })

  // WiMAX直せち: 獲得後1週間後（開通❌除外）
  const directRows = await dbQuery<{ name: string }>(
    `SELECT name FROM activation_records
     WHERE user_id = $1 AND type = 'wimax_direct' AND week_after IN (${ph}) AND (activation IS NULL OR activation != '×')`,
    [session.userId, ...formats]
  )
  for (const r of directRows) items.push({ name: r.name, typeLabel: 'WiMAX直せち', fieldLabel: '獲得後1週間後' })

  // WiMAX後送り: 受取日1週間後（開通❌除外）
  const postRows = await dbQuery<{ name: string }>(
    `SELECT name FROM activation_records
     WHERE user_id = $1 AND type = 'wimax_post' AND week_after_delivery IN (${ph}) AND (activation IS NULL OR activation != '×')`,
    [session.userId, ...formats]
  )
  for (const r of postRows) items.push({ name: r.name, typeLabel: 'WiMAX後送り', fieldLabel: '受取日1週間後' })

  // 開通❌: 業務月内のキャンセル案件（25日ルールで業務月を算出）
  const bmMonth = d >= 25 ? m : (m === 1 ? 12 : m - 1)
  const bmYear  = d >= 25 ? y : (m === 1 ? y - 1 : y)
  const TYPE_LABEL: Record<string, string> = { sonet: 'So-net', wimax_direct: 'WiMAX直せち', wimax_post: 'WiMAX後送り' }
  const cancelRows = await dbQuery<{ name: string; type: string; cancel_reason: string }>(
    `SELECT name, type, cancel_reason FROM activation_records
     WHERE user_id = $1 AND activation = '×' AND year = $2 AND month = $3
     ORDER BY created_at`,
    [session.userId, bmYear, bmMonth]
  )
  for (const r of cancelRows) items.push({
    name: r.name,
    typeLabel: TYPE_LABEL[r.type] ?? r.type,
    fieldLabel: '開通キャンセル',
    kind: 'cancel',
    cancelReason: r.cancel_reason ?? '',
  })

  return NextResponse.json(items)
}
