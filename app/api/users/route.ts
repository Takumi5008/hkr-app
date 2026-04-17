import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'member') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = getDb()
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY name').all()
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

  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 409 })

  const hash = await bcrypt.hash(password, 10)
  const result = db.prepare(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
  ).run(name, email, hash, role ?? 'member') as any

  return NextResponse.json({ id: result.lastInsertRowid, name, email, role: role ?? 'member' })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, role } = await req.json()
  if (id === session.userId) return NextResponse.json({ error: '自分のロールは変更できません' }, { status: 400 })

  const db = getDb()
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
  return NextResponse.json({ ok: true })
}
