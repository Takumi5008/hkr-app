import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne } from '@/lib/db'
import { WEEKLY_QUESTS, getWeekStartJST, getWeekEndJST, getThisFridayJST } from '@/lib/quests'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const userId = session.userId
  const weekStart = getWeekStartJST()
  const weekEnd = getWeekEndJST()
  const friday = getThisFridayJST()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // 今週の開通数（行動表の wimax + sonet 合計）
  const actRow = await dbQueryOne<{ total: string }>(
    `SELECT COALESCE(SUM(wimax + sonet), 0)::int AS total FROM daily_activity
     WHERE user_id = $1 AND date >= $2 AND date <= $3`,
    [userId, weekStart, weekEnd]
  )
  // 今週の行動表入力日数
  const actDayRow = await dbQueryOne<{ cnt: string }>(
    `SELECT COUNT(*)::int AS cnt FROM daily_activity
     WHERE user_id = $1 AND date >= $2 AND date <= $3`,
    [userId, weekStart, weekEnd]
  )
  // 今週のログイン日数
  const loginRow = await dbQueryOne<{ cnt: string }>(
    `SELECT COUNT(*)::int AS cnt FROM login_days
     WHERE user_id = $1 AND date >= $2 AND date <= $3`,
    [userId, weekStart, weekEnd]
  )
  // 今週金曜のMTG出欠
  const mtgRow = await dbQueryOne(
    'SELECT id FROM mtg_attendance WHERE user_id = $1 AND date = $2',
    [userId, friday]
  )
  // 今月シフト提出状況
  const shiftRow = await dbQueryOne(
    'SELECT submitted FROM shifts WHERE user_id = $1 AND year = $2 AND month = $3',
    [userId, year, month]
  )

  // 今週のクレーム済みクエスト
  const claims = await dbQuery(
    'SELECT quest_id FROM weekly_quest_claims WHERE user_id = $1 AND week_start = $2',
    [userId, weekStart]
  )
  const claimedSet = new Set(claims.map((r: any) => r.quest_id))

  const progressMap: Record<string, number> = {
    wq_activation_3: Number(actRow?.total ?? 0),
    wq_activity_3:   Number(actDayRow?.cnt ?? 0),
    wq_login_5:      Number(loginRow?.cnt ?? 0),
    wq_mtg:          mtgRow ? 1 : 0,
    wq_shift:        (shiftRow as any)?.submitted ? 1 : 0,
  }

  const result = WEEKLY_QUESTS.map(q => ({
    ...q,
    current: Math.min(progressMap[q.id] ?? 0, q.target),
    completed: (progressMap[q.id] ?? 0) >= q.target,
    claimed: claimedSet.has(q.id),
  }))

  return NextResponse.json({ quests: result, weekStart })
}
