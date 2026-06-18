import { dbQueryOne, dbRun } from '@/lib/db'
import { getTodayJST } from '@/lib/quests'

/**
 * アプリを開くたびに呼ぶ。ログイン・セッション継続どちらの場合も同じ処理。
 * 今日初回ならlogin_daysに記録し、前日があればstreak+1、なければ1にリセット。
 * 同日複数回呼んでもON CONFLICT DO NOTHINGで冪等。
 */
export async function updateLoginStreak(userId: number): Promise<void> {
  const todayJST = getTodayJST()
  const yesterdayJST = new Date(Date.now() + 9 * 3600_000 - 86_400_000).toISOString().slice(0, 10)

  const inserted = await dbRun(
    'INSERT INTO login_days (user_id, date) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, todayJST]
  )
  if (inserted.rowCount === 0) return // 今日すでに処理済み

  const [user, yesterday] = await Promise.all([
    dbQueryOne<{ login_streak: number; login_count: number }>(
      'SELECT login_streak, login_count FROM users WHERE id = $1',
      [userId]
    ),
    dbQueryOne('SELECT id FROM login_days WHERE user_id = $1 AND date = $2', [userId, yesterdayJST]),
  ])

  const newStreak = yesterday ? (user?.login_streak ?? 0) + 1 : 1
  await dbRun(
    'UPDATE users SET login_count = login_count + 1, login_streak = $1, last_login_at = NOW() WHERE id = $2',
    [newStreak, userId]
  )
}
