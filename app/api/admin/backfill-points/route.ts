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

  // 全ユーザーの全月開通数マイルストーンボーナス
  const milestones = [
    { threshold: 7,  bonus: 20  },
    { threshold: 15, bonus: 50  },
    { threshold: 20, bonus: 100 },
  ]
  const monthlyTotals = await dbQuery<{ user_id: number; year: number; month: number; total: number }>(
    `SELECT user_id, year, month, COALESCE(SUM(activation_count), 0)::int AS total
     FROM records
     GROUP BY user_id, year, month`
  )
  for (const row of monthlyTotals) {
    for (const { threshold, bonus } of milestones) {
      if (row.total >= threshold) {
        await addPointTransaction(
          row.user_id, bonus,
          `月${threshold}開通ボーナス`,
          'milestone',
          `${row.user_id}-${row.year}-${row.month}-${threshold}`
        )
        results.push({ type: `milestone_${threshold}`, userId: row.user_id, name: '', ref: `${row.year}-${row.month}` })
      }
    }
  }

  // 全ユーザーのポイントを再集計
  const users = await dbQuery<{ id: number }>('SELECT id FROM users')
  const { syncUserPoints } = await import('@/lib/points')
  for (const u of users) {
    await syncUserPoints(u.id)
  }

  return NextResponse.json({ ok: true, applied: results.length, results })
}
