import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { dbQueryOne, dbRun } from '@/lib/db'
import { getSession } from '@/lib/session'
import { awardBadges } from '@/lib/badges'
import { updateLoginStreak } from '@/lib/streak'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 })
  }

  const user = await dbQueryOne('SELECT * FROM users WHERE email = $1', [email])

  if (!user) {
    return NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, { status: 401 })
  }

  if (user.is_active === false) {
    return NextResponse.json({ error: 'このアカウントは無効化されています。管理者にお問い合わせください。' }, { status: 403 })
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)
  const isTempValid =
    user.temp_password &&
    user.temp_password === password &&
    user.temp_password_expires_at &&
    new Date(user.temp_password_expires_at) > new Date()

  if (!isPasswordValid && !isTempValid) {
    return NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, { status: 401 })
  }

  // ロールが不正にmemberになっている場合の自動修正
  if (user.email === 'komotaku0508@gmail.com' && user.role === 'member') {
    await dbRun(`UPDATE users SET role = 'manager' WHERE id = $1`, [user.id])
    user.role = 'manager'
  }

  const session = await getSession()
  session.userId = user.id
  session.name = user.name
  session.email = user.email
  session.role = user.role
  await session.save()

  try { await updateLoginStreak(user.id) } catch {}
  try { await awardBadges(user.id) } catch {}

  const requirePasswordChange = isTempValid && !isPasswordValid
  return NextResponse.json({ ok: true, name: user.name, role: user.role, requirePasswordChange })
}
