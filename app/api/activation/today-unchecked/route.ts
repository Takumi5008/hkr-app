import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

const CHECK_FIELDS = [
  { field: 'fm',                      doneField: 'fm_done',                      label: 'FM' },
  { field: 'week_after',              doneField: 'week_after_done',              label: '獲得1週間後' },
  { field: 'day_before_construction', doneField: 'day_before_construction_done', label: '工事日前日' },
  { field: 'construction_date',       doneField: 'construction_date_done',       label: '工事日' },
  { field: 'day_before_delivery',     doneField: 'day_before_delivery_done',     label: '受け取り日前日' },
  { field: 'delivery_date',           doneField: 'delivery_date_done',           label: '受取日' },
  { field: 'week_after_delivery',     doneField: 'week_after_delivery_done',     label: '受け取り1週間後' },
]

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
  // クライアントからJST年月日を受け取る
  const y = parseInt(searchParams.get('y') ?? '0')
  const m = parseInt(searchParams.get('m') ?? '0')
  const d = parseInt(searchParams.get('d') ?? '0')
  if (!y || !m || !d) return NextResponse.json([])

  const formats = todayFormats(y, m, d)
  const placeholders = formats.map((_, i) => `$${i + 2}`).join(', ')

  const items: { name: string; label: string }[] = []

  for (const { field, doneField, label } of CHECK_FIELDS) {
    const rows = await dbQuery<{ name: string }>(
      `SELECT name FROM activation_records
       WHERE user_id = $1 AND ${field} IN (${placeholders}) AND ${doneField} = 0`,
      [session.userId, ...formats]
    )
    for (const row of rows) {
      items.push({ name: row.name, label })
    }
  }

  return NextResponse.json(items)
}
