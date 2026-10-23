import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { getRelyingParty, saveChallenge } from '@/lib/webauthn'

// 未ログイン状態から指紋・顔認証でログインするためのオプション。
// 端末に保存されたパスキー（discoverable credential）を使うので、メールアドレス入力は不要
export async function POST(req: NextRequest) {
  const { rpID } = getRelyingParty(req)
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
  })
  await saveChallenge({ challenge: options.challenge, purpose: 'login' })
  return NextResponse.json(options)
}
