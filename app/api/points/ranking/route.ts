import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'viewer') return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const rows = await dbQuery(
    `SELECT id, name, avatar, points FROM users ORDER BY points DESC, name ASC`
  )
  return NextResponse.json(rows)
}
