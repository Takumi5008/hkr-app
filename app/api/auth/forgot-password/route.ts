import { NextRequest, NextResponse } from 'next/server'
import { dbQueryOne, dbRun } from '@/lib/db'

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'メールアドレスを入力してください' }, { status: 400 })

  const user = await dbQueryOne('SELECT id FROM users WHERE email = $1', [email])

  if (!user) {
    return NextResponse.json({ error: 'このメールアドレスは登録されていません' }, { status: 404 })
  }

  const tempPassword = generateTempPassword()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  await dbRun(
    'UPDATE users SET temp_password = $1, temp_password_expires_at = $2 WHERE id = $3',
    [tempPassword, expiresAt, user.id]
  )

  return NextResponse.json({ tempPassword })
}
