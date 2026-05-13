import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')
  if (!year || !month) return NextResponse.json({ error: 'year と month を指定してください' }, { status: 400 })

  const rows = await dbQuery(
    'SELECT * FROM monthly_reviews WHERE user_id = $1 AND year = $2 AND month = $3',
    [session.userId, year, month]
  )
  return NextResponse.json(rows[0] ?? null)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { year, month, self_score, good_points, challenges, next_goals, app_good, app_requests } = await req.json()
  if (!year || !month || !self_score) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  await dbRun(
    `INSERT INTO monthly_reviews (user_id, year, month, self_score, good_points, challenges, next_goals, app_good, app_requests, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
     ON CONFLICT (user_id, year, month) DO UPDATE
       SET self_score = $4, good_points = $5, challenges = $6, next_goals = $7,
           app_good = $8, app_requests = $9, submitted_at = TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
    [session.userId, year, month, self_score, good_points ?? '', challenges ?? '', next_goals ?? '', app_good ?? '', app_requests ?? '']
  )
  return NextResponse.json({ ok: true })
}
