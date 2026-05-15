import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const users = await dbQuery(
    `SELECT id, name, role, position, manager_id, org_visible, avatar, profile_memo
     FROM users WHERE is_active = true ORDER BY display_order ASC, name ASC`
  )
  return NextResponse.json(users)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const body = await req.json()
  const { id, position, manager_id, org_visible, profile_memo } = body
  const isAdmin = session.role === 'admin' || session.role === 'manager'
  const isSelf = session.userId === id

  // profile_memo は本人または管理者が編集可能
  if (profile_memo !== undefined) {
    if (!isSelf && !isAdmin) return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    await dbRun('UPDATE users SET profile_memo = $1 WHERE id = $2', [profile_memo, id])
  }

  // それ以外は管理者のみ
  if (position !== undefined || 'manager_id' in body || org_visible !== undefined) {
    if (!isAdmin) return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    if (position !== undefined) {
      await dbRun('UPDATE users SET position = $1 WHERE id = $2', [position, id])
    }
    if ('manager_id' in body) {
      await dbRun('UPDATE users SET manager_id = $1 WHERE id = $2', [manager_id ?? null, id])
    }
    if (org_visible !== undefined) {
      await dbRun('UPDATE users SET org_visible = $1 WHERE id = $2', [org_visible, id])
    }
  }

  return NextResponse.json({ ok: true })
}
