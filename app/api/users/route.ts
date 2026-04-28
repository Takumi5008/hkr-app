import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { dbQuery, dbQueryOne, dbRun } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'member' || session.role === 'shift_viewer') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await dbQuery('SELECT id, name, email, role, display_order, created_at FROM users ORDER BY display_order ASC, name ASC')
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, password, role } = await req.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: '名前・メール・パスワードは必須です' }, { status: 400 })
  }

  const existing = await dbQueryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing) return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 409 })

  const hash = await bcrypt.hash(password, 10)
  const result = await dbRun(
    'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
    [name, email, hash, role ?? 'member']
  )

  return NextResponse.json({ id: result.id, name, email, role: role ?? 'member' })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, role, display_order } = await req.json()

  if (display_order !== undefined) {
    await dbRun('UPDATE users SET display_order = $1 WHERE id = $2', [display_order, id])
    return NextResponse.json({ ok: true })
  }

  if (id === session.userId) return NextResponse.json({ error: '自分のロールは変更できません' }, { status: 400 })
  await dbRun('UPDATE users SET role = $1 WHERE id = $2', [role, id])
  return NextResponse.json({ ok: true })
}
