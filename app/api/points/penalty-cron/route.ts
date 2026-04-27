import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'
import { addPointTransaction } from '@/lib/points'

// 毎日 21:00 JST (12:00 UTC) に実行
// 各 done フィールドの日付を超過しても⭕️未完了なら -5pt
const DONE_FIELDS = [
  { field: 'fm',                      doneField: 'fm_done',                      label: 'FM' },
  { field: 'week_after',              doneField: 'week_after_done',              label: '獲得1週間後' },
  { field: 'day_before_construction', doneField: 'day_before_construction_done', label: '工事日前日' },
  { field: 'construction_date',       doneField: 'construction_date_done',       label: '工事日' },
  { field: 'day_before_delivery',     doneField: 'day_before_delivery_done',     label: '受け取り日前日' },
  { field: 'delivery_date',           doneField: 'delivery_date_done',           label: '受取日' },
  { field: 'week_after_delivery',     doneField: 'week_after_delivery_done',     label: '受け取り1週間後' },
] as const

export async function GET() {
  let penalized = 0

  for (const { field, doneField, label } of DONE_FIELDS) {
    const records = await dbQuery<{ id: number; user_id: number }>(
      `SELECT id, user_id FROM activation_records
       WHERE ${field} ~ '^\\d{4}-\\d{2}-\\d{2}$'
       AND ${field}::date < CURRENT_DATE
       AND (${doneField} IS NULL OR ${doneField} = 0)`,
      []
    )
    for (const rec of records) {
      await addPointTransaction(
        rec.user_id, -5, `${label}期限超過`, `penalty_${field}`, String(rec.id)
      )
      penalized++
    }
  }

  return NextResponse.json({ ok: true, penalized })
}
