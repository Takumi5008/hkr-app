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

  // 開通表の種別ごとに、日付が一致する未対応案件を拾う（開通❌除外、対応済み除外）
  const FOLLOW_QUERIES = [
    { type: 'sonet',        field: 'construction_date',  typeLabel: 'So-net',        fieldLabel: '工事日当日' },
    { type: 'nifty',        field: 'construction_date',  typeLabel: '@nifty光',      fieldLabel: '工事日当日' },
    { type: 'sbhikari',     field: 'construction_date',  typeLabel: 'SB光',          fieldLabel: '工事日当日' },
    { type: 'wimax_direct', field: 'week_after',         typeLabel: 'WiMAX直せち',   fieldLabel: '獲得後1週間後' },
    { type: 'sbair_direct', field: 'week_after',         typeLabel: 'SBAir直せち',   fieldLabel: '獲得後1週間後' },
    { type: 'wimax_post',   field: 'week_after_delivery', typeLabel: 'WiMAX後送り',  fieldLabel: '受取日1週間後' },
    { type: 'sbair_post',   field: 'week_after_delivery', typeLabel: 'SBAir後送り',  fieldLabel: '受取日1週間後' },
  ] as const
  for (const fq of FOLLOW_QUERIES) {
    const rows = await dbQuery<{ name: string }>(
      `SELECT name FROM activation_records
       WHERE user_id = $1 AND type = '${fq.type}' AND ${fq.field} IN (${ph}) AND (activation IS NULL OR activation != '×') AND ${fq.field}_done = 0`,
      [session.userId, ...formats]
    )
    for (const r of rows) items.push({ name: r.name, typeLabel: fq.typeLabel, fieldLabel: fq.fieldLabel })
  }

  // 開通❌: 業務月内のキャンセル案件（25日ルールで業務月を算出）
  const bmMonth = d >= 25 ? m : (m === 1 ? 12 : m - 1)
  const bmYear  = d >= 25 ? y : (m === 1 ? y - 1 : y)
  const TYPE_LABEL: Record<string, string> = {
    sonet: 'So-net', nifty: '@nifty光', sbhikari: 'SB光',
    wimax_direct: 'WiMAX直せち', sbair_direct: 'SBAir直せち',
    wimax_post: 'WiMAX後送り', sbair_post: 'SBAir後送り',
  }
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
