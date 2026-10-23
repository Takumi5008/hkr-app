import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne, dbRun } from '@/lib/db'
import { toInt } from '@/lib/parse'

// 60秒で物理的に不可能なスコアは弾く（毎秒20打鍵 = 1200 を上限）
const MAX_SCORE = 1200

// 今週の月曜 0:00（JST）を played_at と同じ UTC 文字列で返す
function weekStartUtc(now: Date = new Date()): string {
  const JST = 9 * 60 * 60 * 1000
  const jst = new Date(now.getTime() + JST)
  const daysSinceMonday = (jst.getUTCDay() + 6) % 7
  const mondayJst = Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() - daysSinceMonday)
  return new Date(mondayJst - JST).toISOString().slice(0, 19) + 'Z'
}

// 今週のランキング（各メンバーのベストスコア）と自分の記録
export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const since = weekStartUtc()
  const [ranking, myBest, myWeekBest] = await Promise.all([
    dbQuery<{ user_id: number; name: string; avatar: string | null; best: number; plays: number }>(
      `SELECT u.id AS user_id, u.name, u.avatar, MAX(t.score)::int AS best, COUNT(*)::int AS plays
       FROM typing_scores t JOIN users u ON u.id = t.user_id
       WHERE t.played_at >= $1
       GROUP BY u.id, u.name, u.avatar
       ORDER BY best DESC, MIN(t.played_at) ASC
       LIMIT 20`,
      [since]
    ),
    dbQueryOne<{ best: number | null }>('SELECT MAX(score)::int AS best FROM typing_scores WHERE user_id = $1', [session.userId]),
    dbQueryOne<{ best: number | null }>(
      'SELECT MAX(score)::int AS best FROM typing_scores WHERE user_id = $1 AND played_at >= $2',
      [session.userId, since]
    ),
  ])

  return NextResponse.json({
    weekStart: since,
    ranking,
    myUserId: session.userId,
    myBest: myBest?.best ?? null,
    myWeekBest: myWeekBest?.best ?? null,
  })
}

// スコア登録
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const body = await req.json()
  const score = toInt(body.score)
  const miss = toInt(body.miss)
  const words = toInt(body.words)
  if (score < 0 || score > MAX_SCORE || miss < 0 || miss > 5000 || words < 0 || words > score) {
    return NextResponse.json({ error: '不正なスコアです' }, { status: 400 })
  }

  await dbRun(
    'INSERT INTO typing_scores (user_id, score, miss, words) VALUES ($1, $2, $3, $4)',
    [session.userId, score, miss, words]
  )
  return NextResponse.json({ ok: true })
}
