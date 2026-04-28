import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { dbQueryOne, dbRun } from '@/lib/db'
import { getSession } from '@/lib/session'
import { awardBadges } from '@/lib/badges'
import { getTodayJST } from '@/lib/quests'

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
  const todayJST = getTodayJST()
  const yesterdayJST = new Date(Date.now() + 9 * 3600_000 - 86_400_000).toISOString().slice(0, 10)

  // 今日初ログインかチェック（login_days に挿入）
  const insertDay = await dbRun(
    'INSERT INTO login_days (user_id, date) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [user.id, todayJST]
  )
  const isNewDay = insertDay.rowCount > 0

  if (isNewDay) {
    const yesterday = await dbQueryOne(
      'SELECT id FROM login_days WHERE user_id = $1 AND date = $2',
      [user.id, yesterdayJST]
    )
    const newStreak = yesterday ? (user.login_streak ?? 0) + 1 : 1
    await dbRun(
      'UPDATE users SET login_count = login_count + 1, login_streak = $1, last_login_at = $2 WHERE id = $3',
      [newStreak, now.toISOString(), user.id]
    )
  } else {
    await dbRun('UPDATE users SET last_login_at = $1 WHERE id = $2', [now.toISOString(), user.id])
  }

  await awardBadges(user.id)

  const requirePasswordChange = isTempValid && !isPasswordValid
  return NextResponse.json({ ok: true, name: user.name, role: user.role, requirePasswordChange })
}
