import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, email } = await req.json()
  if (!name || !email) {
    return NextResponse.json({ error: '名前とメールアドレスを入力してください' }, { status: 400 })
  }

  const db = getDb()

  // メール重複チェック（自分以外）
  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, session.userId)
  if (existing) {
    return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 409 })
  }

  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, session.userId)

  // セッションも更新
  session.name = name
  session.email = email
  await session.save()

  return NextResponse.json({ ok: true, name, email })
}
