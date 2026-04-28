import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'
import { BADGES } from '@/lib/badges'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const earned = await dbQuery(
    'SELECT badge_id, earned_at FROM user_badges WHERE user_id = $1 ORDER BY earned_at ASC',
    [session.userId]
  )
  const earnedSet = new Set(earned.map((r: any) => r.badge_id))

  const result = BADGES.map(b => ({
    ...b,
    earned: earnedSet.has(b.id),
    earnedAt: earned.find((r: any) => r.badge_id === b.id)?.earned_at ?? null,
  }))

  return NextResponse.json(result)
}
