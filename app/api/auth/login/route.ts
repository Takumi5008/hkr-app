import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { dbQueryOne, dbRun } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 })
  }

  const user = await dbQueryOne('SELECT * FROM users WHERE email = $1', [email])

  if (!user) {
    return NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, { status: 401 })
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

  const session = await getSession()
  session.userId = user.id
  session.name = user.name
  session.email = user.email
  session.role = user.role
  await session.save()

  const now = new Date()
  const todayJST = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const lastLoginJST = user.last_login_at
    ? new Date(new Date(user.last_login_at).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : null
  const isNewDay = lastLoginJST !== todayJST
  await dbRun(
    `UPDATE users SET login_count = login_count + $1, last_login_at = $2 WHERE id = $3`,
    [isNewDay ? 1 : 0, now.toISOString(), user.id]
  )

  const requirePasswordChange = isTempValid && !isPasswordValid
  return NextResponse.json({ ok: true, name: user.name, role: user.role, requirePasswordChange })
}
