import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'

// トークンの検証（GETで登録ページの表示前チェックに使用）
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: '招待トークンが指定されていません' }, { status: 400 })

  const db = getDb()
  const invite = db.prepare(
    `SELECT * FROM invite_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')`
  ).get(token) as any

  if (!invite) return NextResponse.json({ error: 'この招待リンクは無効または期限切れです' }, { status: 404 })

  return NextResponse.json({ valid: true })
}

// 新規登録（トークンなしでも登録可能）
export async function POST(req: NextRequest) {
  const { token, name, email, password } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'すべての項目を入力してください' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'パスワードは6文字以上で入力してください' }, { status: 400 })
  }

  const db = getDb()

  // メール重複チェック
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 409 })
  }

  const hash = await bcrypt.hash(password, 10)

  // 招待トークンがある場合は使用済みにする
  if (token) {
    const invite = db.prepare(
      `SELECT * FROM invite_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')`
    ).get(token) as any

    db.transaction(() => {
      db.prepare(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
      ).run(name, email, hash, 'member')
      if (invite) {
        db.prepare('UPDATE invite_tokens SET used = 1 WHERE id = ?').run(invite.id)
      }
    })()
  } else {
    db.prepare(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
    ).run(name, email, hash, 'member')
  }

  return NextResponse.json({ ok: true })
}
