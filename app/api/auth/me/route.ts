import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQueryOne } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = await dbQueryOne('SELECT points, avatar, login_count, last_login_at FROM users WHERE id = $1', [session.userId])
  return NextResponse.json({
    id: session.userId,
    userId: session.userId,
    name: session.name,
    email: session.email,
    role: session.role,
    points: (user as any)?.points ?? 0,
    avatar: (user as any)?.avatar ?? null,
    loginCount: (user as any)?.login_count ?? 0,
    lastLoginAt: (user as any)?.last_login_at ?? null,
  })
}
