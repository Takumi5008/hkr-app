import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'
import { addPointTransaction } from '@/lib/points'

// 4/26 23:59 JST = 2026-04-26T14:59:59Z (UTC)
const DEADLINE = '2026-04-26T14:59:59Z'

export async function POST() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const results: { type: string; userId: number; name: string; ref: string }[] = []

  // 5月シフト: 期限内に提出済みのユーザー
  const shifts = await dbQuery<{ user_id: number; name: string }>(
    `SELECT s.user_id, u.name
     FROM shifts s
     JOIN users u ON u.id = s.user_id
     WHERE s.year = 2026 AND s.month = 5
       AND s.submitted = 1
       AND s.updated_at <= $1`,
    [DEADLINE]
  )

  for (const s of shifts) {
    await addPointTransaction(s.user_id, 1, 'シフト時間内提出', 'shift_submit', '2026-5')
    results.push({ type: 'shift', userId: s.user_id, name: s.name, ref: '2026-5' })
  }

  // MTG出欠: 期限内に提出済みのレコード
  const mtg = await dbQuery<{ user_id: number; name: string; date: string }>(
    `SELECT a.user_id, u.name, a.date
     FROM mtg_attendance a
     JOIN users u ON u.id = a.user_id
     WHERE a.updated_at <= $1`,
    [DEADLINE]
  )

  for (const m of mtg) {
    await addPointTransaction(m.user_id, 1, 'MTG出欠時間内提出', 'mtg_submit', m.date)
    results.push({ type: 'mtg', userId: m.user_id, name: m.name, ref: m.date })
  }

  return NextResponse.json({ ok: true, applied: results.length, results })
}
