import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import { getSession } from '@/lib/session'
import { dbRun } from '@/lib/db'
import { consumeChallenge, getRelyingParty, guessDeviceName } from '@/lib/webauthn'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const stored = await consumeChallenge('register')
  if (!stored || stored.userId !== session.userId) {
    return NextResponse.json({ error: '登録の有効期限が切れました。もう一度お試しください' }, { status: 400 })
  }

  const { rpID, origin } = getRelyingParty(req)
  const body = await req.json()

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    })
  } catch {
    return NextResponse.json({ error: '生体認証の登録に失敗しました' }, { status: 400 })
  }
  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: '生体認証の登録に失敗しました' }, { status: 400 })
  }

  const { credential } = verification.registrationInfo
  await dbRun(
    `INSERT INTO webauthn_credentials (id, user_id, public_key, counter, transports, device_name)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [
      credential.id,
      session.userId,
      isoBase64URL.fromBuffer(credential.publicKey),
      credential.counter,
      (credential.transports ?? []).join(','),
      guessDeviceName(req.headers.get('user-agent')),
    ]
  )

  return NextResponse.json({ ok: true })
}
