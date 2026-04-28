import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbRun, dbQueryOne } from '@/lib/db'
import { addPointTransaction } from '@/lib/points'
import { awardBadges } from '@/lib/badges'
import { WEEKLY_QUESTS, getWeekStartJST, getWeekEndJST, getThisFridayJST } from '@/lib/quests'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { questId } = await req.json()
  const quest = WEEKLY_QUESTS.find(q => q.id === questId)
  if (!quest) return NextResponse.json({ error: '無効なクエスト' }, { status: 400 })

  const userId = session.userId
  const weekStart = getWeekStartJST()
  const weekEnd = getWeekEndJST()
  const friday = getThisFridayJST()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // 達成チェック
  let current = 0
  if (questId === 'wq_activation_3') {
    const r = await dbQueryOne<{ total: string }>(`SELECT COALESCE(SUM(wimax + sonet), 0)::int AS total FROM daily_activity WHERE user_id = $1 AND date >= $2 AND date <= $3`, [userId, weekStart, weekEnd])
    current = Number(r?.total ?? 0)
  } else if (questId === 'wq_activity_3') {
    const r = await dbQueryOne<{ cnt: string }>(`SELECT COUNT(*)::int AS cnt FROM daily_activity WHERE user_id = $1 AND date >= $2 AND date <= $3`, [userId, weekStart, weekEnd])
    current = Number(r?.cnt ?? 0)
  } else if (questId === 'wq_login_5') {
    const r = await dbQueryOne<{ cnt: string }>(`SELECT COUNT(*)::int AS cnt FROM login_days WHERE user_id = $1 AND date >= $2 AND date <= $3`, [userId, weekStart, weekEnd])
    current = Number(r?.cnt ?? 0)
  } else if (questId === 'wq_mtg') {
    const r = await dbQueryOne('SELECT id FROM mtg_attendance WHERE user_id = $1 AND date = $2', [userId, friday])
    current = r ? 1 : 0
  } else if (questId === 'wq_shift') {
    const r = await dbQueryOne('SELECT submitted FROM shifts WHERE user_id = $1 AND year = $2 AND month = $3', [userId, year, month])
    current = (r as any)?.submitted ? 1 : 0
  }

  if (current < quest.target) return NextResponse.json({ error: 'クエスト未達成' }, { status: 400 })

  // 既にクレーム済みか確認
  const existing = await dbQueryOne(
    'SELECT id FROM weekly_quest_claims WHERE user_id = $1 AND quest_id = $2 AND week_start = $3',
    [userId, questId, weekStart]
  )
  if (existing) return NextResponse.json({ error: '既に受け取り済みです' }, { status: 400 })

  // クレーム記録 + ポイント付与
  await dbRun(
    'INSERT INTO weekly_quest_claims (user_id, quest_id, week_start) VALUES ($1, $2, $3)',
    [userId, questId, weekStart]
  )
  await addPointTransaction(userId, quest.reward, `クエスト達成: ${quest.title}`, 'quest', `${questId}:${weekStart}`)
  await awardBadges(userId)

  const user = await dbQueryOne('SELECT points, level FROM users WHERE id = $1', [userId])
  return NextResponse.json({ ok: true, newPoints: (user as any)?.points ?? 0, reward: quest.reward })
}
