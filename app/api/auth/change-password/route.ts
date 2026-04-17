import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: '新しいパスワードは6文字以上で入力してください' }, { status: 400 })
  }

  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId) as any

  // 現在パスワードまたは仮パスワードで認証
  const isCurrentValid = await bcrypt.compare(currentPassword, user.password)
  const isTempValid =
    user.temp_password === currentPassword &&
    user.temp_password_expires_at &&
    new Date(user.temp_password_expires_at) > new Date()

  if (!isCurrentValid && !isTempValid) {
    return NextResponse.json({ error: '現在のパスワード（または仮パスワード）が正しくありません' }, { status: 401 })
  }

  const hash = await bcrypt.hash(newPassword, 10)
  db.prepare(
    'UPDATE users SET password = ?, temp_password = NULL, temp_password_expires_at = NULL WHERE id = ?'
  ).run(hash, session.userId)

  return NextResponse.json({ ok: true })
}
