import { getIronSession, IronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  userId: number
  name: string
  email: string
  role: 'member' | 'viewer' | 'manager' | 'shift_viewer'
}

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET || 'hkr-app-secret-key-change-in-production-32chars',
  cookieName: 'hkr_session',
  cookieOptions: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7日
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS)
}
