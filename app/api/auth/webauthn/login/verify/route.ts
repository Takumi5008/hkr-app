import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import { dbQueryOne, dbRun } from '@/lib/db'
import { startSession, type SessionData } from '@/lib/session'
import { consumeChallenge, getRelyingParty } from '@/lib/webauthn'
import { awardBadges } from '@/lib/badges'
import { updateLoginStreak } from '@/lib/streak'

const FAILED = '生体認証でログインできませんでした。この端末で登録済みか確認してください'

export async function POST(req: NextRequest) {
  const stored = await consumeChallenge('login')
  if (!stored) return NextResponse.json({ error: '有効期限が切れました。もう一度お試しください' }, { status: 400 })

  const body = await req.json()
  if (typeof body?.id !== 'string') return NextResponse.json({ error: FAILED }, { status: 400 })

  const cred = await dbQueryOne<{ id: string; user_id: number; public_key: string; counter: string; transports: string }>(
    'SELECT id, user_id, public_key, counter, transports FROM webauthn_credentials WHERE id = $1',
    [body.id]
  )
  if (!cred) return NextResponse.json({ error: FAILED }, { status: 401 })

  const { rpID, origin } = getRelyingParty(req)
  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: cred.id,
        publicKey: isoBase64URL.toBuffer(cred.public_key),
        counter: Number(cred.counter),
        transports: cred.transports ? (cred.transports.split(',') as AuthenticatorTransportFuture[]) : undefined,
      },
    })
  } catch {
    return NextResponse.json({ error: FAILED }, { status: 401 })
  }
  if (!verification.verified) return NextResponse.json({ error: FAILED }, { status: 401 })

  const user = await dbQueryOne<{ id: number; name: string; email: string; role: SessionData['role']; is_active: boolean }>(
    'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
    [cred.user_id]
  )
  if (!user) return NextResponse.json({ error: FAILED }, { status: 401 })
  if (user.is_active === false) {
    return NextResponse.json({ error: 'このアカウントは無効化されています。管理者にお問い合わせください。' }, { status: 403 })
  }

  await dbRun(
    `UPDATE webauthn_credentials SET counter = $1, last_used_at = TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') WHERE id = $2`,
    [verification.authenticationInfo.newCounter, cred.id]
  )

  await startSession({ userId: user.id, name: user.name, email: user.email, role: user.role })

  try { await updateLoginStreak(user.id) } catch {}
  try { await awardBadges(user.id) } catch {}

  return NextResponse.json({ ok: true, name: user.name, role: user.role })
}
