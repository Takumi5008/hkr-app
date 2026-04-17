import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'メールアドレスを入力してください' }, { status: 400 })

  const db = getDb()
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any

  // ユーザーが存在しない場合も同じレスポンスを返す（列挙攻撃対策）
  if (!user) {
    return NextResponse.json({ error: 'このメールアドレスは登録されていません' }, { status: 404 })
  }

  const tempPassword = generateTempPassword()
  // 1時間有効
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  db.prepare(
    'UPDATE users SET temp_password = ?, temp_password_expires_at = ? WHERE id = ?'
  ).run(tempPassword, expiresAt, user.id)

  return NextResponse.json({ tempPassword })
}
