import { getIronSession, IronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  userId: number
  name: string
  email: string
  role: 'member' | 'viewer' | 'manager' | 'shift_viewer' | 'admin'
  // ログイン状態の有効期限（epoch ms）。ログインした日の翌0時（JST）
  expiresAt?: number
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

// 次の 0:00（JST）の epoch ms
export function nextJstMidnight(now: number = Date.now()): number {
  return Math.floor((now + JST_OFFSET_MS) / DAY_MS) * DAY_MS + DAY_MS - JST_OFFSET_MS
}

function sessionOptions() {
  // Cookie も日付が変わる時点で切れるようにする（最低60秒）
  const maxAge = Math.max(60, Math.floor((nextJstMidnight() - Date.now()) / 1000))
  return {
    password: process.env.SESSION_SECRET || 'hkr-app-secret-key-change-in-production-32chars',
    cookieName: 'hkr_session',
    cookieOptions: {
      secure: false,
      httpOnly: true,
      sameSite: 'lax' as const,
      maxAge,
    },
  }
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions())
  // 日付が変わったら（または期限情報の無い旧セッションは）未ログイン扱いにする。
  // Server Component からは Cookie を書き換えられないため、ここではメモリ上で消すだけにする。
  if (session.userId && (!session.expiresAt || Date.now() >= session.expiresAt)) {
    delete (session as Partial<SessionData>).userId
    delete (session as Partial<SessionData>).name
    delete (session as Partial<SessionData>).email
    delete (session as Partial<SessionData>).role
    delete session.expiresAt
  }
  return session
}

// ログイン成功時にセッションを開始する（パスワード・生体認証共通）
export async function startSession(user: Pick<SessionData, 'userId' | 'name' | 'email' | 'role'>) {
  const session = await getSession()
  session.userId = user.userId
  session.name = user.name
  session.email = user.email
  session.role = user.role
  session.expiresAt = nextJstMidnight()
  await session.save()
  return session
}
