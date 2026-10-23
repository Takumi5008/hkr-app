import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'
import { RP_NAME, getRelyingParty, saveChallenge } from '@/lib/webauthn'

// ログイン中のユーザーが、この端末の指紋・顔認証（パスキー）を登録するためのオプション
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { rpID } = getRelyingParty(req)
  const existing = await dbQuery<{ id: string; transports: string }>(
    'SELECT id, transports FROM webauthn_credentials WHERE user_id = $1',
    [session.userId]
  )

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: session.email,
    userDisplayName: session.name,
    userID: new TextEncoder().encode(String(session.userId)),
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({
      id: c.id,
      transports: c.transports ? (c.transports.split(',') as AuthenticatorTransportFuture[]) : undefined,
    })),
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'required',
    },
  })

  await saveChallenge({ challenge: options.challenge, purpose: 'register', userId: session.userId })
  return NextResponse.json(options)
}
