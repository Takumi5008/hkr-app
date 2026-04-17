import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { dbQueryOne } from '@/lib/db'
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

  const requirePasswordChange = isTempValid && !isPasswordValid
  return NextResponse.json({ ok: true, name: user.name, role: user.role, requirePasswordChange })
}
