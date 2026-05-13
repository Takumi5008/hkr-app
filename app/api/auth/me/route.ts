import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQueryOne } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await dbQueryOne('SELECT role, is_active, points, level, login_streak, avatar, login_count, last_login_at FROM users WHERE id = $1', [session.userId])

  if ((user as any)?.is_active === false) {
    session.destroy()
    return NextResponse.json({ error: 'このアカウントは無効化されています。' }, { status: 403 })
  }

  // Sync role from DB in case it was changed by an admin
  const dbRole = (user as any)?.role
  if (dbRole && dbRole !== session.role) {
    session.role = dbRole
    await session.save()
  }

  return NextResponse.json({
    id: session.userId,
    userId: session.userId,
    name: session.name,
    email: session.email,
    role: dbRole ?? session.role,
    points: (user as any)?.points ?? 0,
    level: (user as any)?.level ?? 0,
    loginStreak: (user as any)?.login_streak ?? 0,
    avatar: (user as any)?.avatar ?? null,
    loginCount: (user as any)?.login_count ?? 0,
    lastLoginAt: (user as any)?.last_login_at ?? null,
  })
}
