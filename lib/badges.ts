import { dbQueryOne, dbRun } from './db'

export interface BadgeDef {
  id: string
  name: string
  icon: string
  desc: string
  color: string
}

export const BADGES: BadgeDef[] = [
  { id: 'first_login',    name: '初ログイン',       icon: '🌱', desc: 'はじめてログインした',         color: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'login_7',        name: '週間皆勤',          icon: '📅', desc: 'ログイン日数7日達成',          color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'login_30',       name: '月間皆勤',          icon: '🏅', desc: 'ログイン日数30日達成',         color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'streak_7',       name: '7連続ログイン',     icon: '🔥', desc: '7日連続でログインした',        color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'streak_30',      name: '30連続ログイン',    icon: '⚡', desc: '30日連続でログインした',       color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'level_5',        name: 'Lv.5到達',          icon: '⭐', desc: 'レベル5に到達',               color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'level_10',       name: 'Lv.10到達',         icon: '🌟', desc: 'レベル10に到達',              color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'level_30',       name: 'Lv.30到達',         icon: '💫', desc: 'レベル30に到達',              color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'level_50',       name: 'Lv.50到達',         icon: '🏆', desc: 'レベル50に到達',              color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'activation_1',   name: '初開通',            icon: '🎉', desc: 'はじめて開通を記録した',      color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'activation_10',  name: '10件開通',          icon: '💪', desc: '累計開通10件達成',            color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'activation_50',  name: '50件開通',          icon: '🚀', desc: '累計開通50件達成',            color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { id: 'activation_100', name: '100件開通',         icon: '👑', desc: '累計開通100件達成',           color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { id: 'quest_3',        name: 'クエストマスター',  icon: '🗺️', desc: 'ウィークリークエストを3回達成', color: 'bg-teal-100 text-teal-700 border-teal-200' },
]

export async function awardBadges(userId: number): Promise<string[]> {
  const user = await dbQueryOne<{ login_count: number; login_streak: number; level: number }>(
    'SELECT login_count, login_streak, level FROM users WHERE id = $1',
    [userId]
  )
  const actRow = await dbQueryOne<{ total: string }>(
    'SELECT COALESCE(SUM(activation_count), 0)::int AS total FROM records WHERE user_id = $1',
    [userId]
  )
  const questRow = await dbQueryOne<{ cnt: string }>(
    'SELECT COUNT(*)::int AS cnt FROM weekly_quest_claims WHERE user_id = $1',
    [userId]
  )

  const loginCount = user?.login_count ?? 0
  const streak = user?.login_streak ?? 0
  const level = user?.level ?? 0
  const total = Number(actRow?.total ?? 0)
  const questCount = Number(questRow?.cnt ?? 0)

  const conditions: Record<string, boolean> = {
    first_login:    loginCount >= 1,
    login_7:        loginCount >= 7,
    login_30:       loginCount >= 30,
    streak_7:       streak >= 7,
    streak_30:      streak >= 30,
    level_5:        level >= 5,
    level_10:       level >= 10,
    level_30:       level >= 30,
    level_50:       level >= 50,
    activation_1:   total >= 1,
    activation_10:  total >= 10,
    activation_50:  total >= 50,
    activation_100: total >= 100,
    quest_3:        questCount >= 3,
  }

  const newBadges: string[] = []
  for (const [badgeId, earned] of Object.entries(conditions)) {
    if (earned) {
      const result = await dbRun(
        'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, badgeId]
      )
      if (result.rowCount > 0) newBadges.push(badgeId)
    }
  }
  return newBadges
}
