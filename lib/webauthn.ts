import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

export const RP_NAME = 'インフラ管理'

// WebAuthn の RP ID / Origin はアクセスされたホストに合わせる
// （本番ドメイン・プレビュー・localhost のいずれでも動くように）
export function getRelyingParty(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost'
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const rpID = host.split(':')[0]
  return { rpID, origin: `${proto}://${host}` }
}

type ChallengeData = { challenge?: string; purpose?: 'register' | 'login'; userId?: number; issuedAt?: number }

const CHALLENGE_TTL_MS = 5 * 60 * 1000

async function getChallengeSession() {
  const cookieStore = await cookies()
  return getIronSession<ChallengeData>(cookieStore, {
    password: process.env.SESSION_SECRET || 'hkr-app-secret-key-change-in-production-32chars',
    cookieName: 'hkr_webauthn',
    ttl: 10 * 60,
    cookieOptions: { httpOnly: true, sameSite: 'strict' as const, maxAge: 5 * 60 },
  })
}

export async function saveChallenge(data: Required<Pick<ChallengeData, 'challenge' | 'purpose'>> & { userId?: number }) {
  const s = await getChallengeSession()
  s.challenge = data.challenge
  s.purpose = data.purpose
  s.userId = data.userId
  s.issuedAt = Date.now()
  await s.save()
}

// 使い捨て：取り出したら破棄する。期限切れ・用途違いは null
export async function consumeChallenge(purpose: 'register' | 'login'): Promise<{ challenge: string; userId?: number } | null> {
  const s = await getChallengeSession()
  const { challenge, purpose: p, userId, issuedAt } = s
  s.destroy()
  if (!challenge || p !== purpose || !issuedAt || Date.now() - issuedAt > CHALLENGE_TTL_MS) return null
  return { challenge, userId }
}

// User-Agent から端末名をざっくり推定（設定画面の一覧表示用）
export function guessDeviceName(ua: string | null): string {
  if (!ua) return '不明な端末'
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  return 'その他の端末'
}
