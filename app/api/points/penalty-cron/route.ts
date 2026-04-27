import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'
import { addPointTransaction } from '@/lib/points'

// 毎日 21:00 JST (12:00 UTC) に実行
// 当日の activation_records で ⭕️未確認のものを 1件 -5pt
export async function GET() {
  // 21:00 JST のとき UTC と JST の日付は一致する
  const today = new Date().toISOString().slice(0, 10)

  const records = await dbQuery<{ id: number; user_id: number }>(
    `SELECT id, user_id FROM activation_records
     WHERE date = $1 AND (activation IS NULL OR activation = '')`,
    [today]
  )

  let penalized = 0
  for (const rec of records) {
    await addPointTransaction(
      rec.user_id, -5, '開通確認期限超過', 'penalty', String(rec.id)
    )
    penalized++
  }

  return NextResponse.json({ ok: true, date: today, penalized })
}
