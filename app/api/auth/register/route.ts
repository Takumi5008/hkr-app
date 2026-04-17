import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { dbQueryOne, dbRun, dbTransaction } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: '招待トークンが指定されていません' }, { status: 400 })

  const invite = await dbQueryOne(
    `SELECT * FROM invite_tokens WHERE token = $1 AND used = 0 AND expires_at > TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
    [token]
  )

  if (!invite) return NextResponse.json({ error: 'この招待リンクは無効または期限切れです' }, { status: 404 })
  return NextResponse.json({ valid: true })
}

export async function POST(req: NextRequest) {
  const { token, name, email, password } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'すべての項目を入力してください' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'パスワードは6文字以上で入力してください' }, { status: 400 })
  }

  const existing = await dbQueryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing) {
    return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 409 })
  }

  const hash = await bcrypt.hash(password, 10)

  if (token) {
    const invite = await dbQueryOne(
      `SELECT * FROM invite_tokens WHERE token = $1 AND used = 0 AND expires_at > TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
      [token]
    )
    await dbTransaction(async (client) => {
      await client.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [name, email, hash, 'member'])
      if (invite) {
        await client.query('UPDATE invite_tokens SET used = 1 WHERE id = $1', [invite.id])
      }
    })
  } else {
    await dbRun('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [name, email, hash, 'member'])
  }

  return NextResponse.json({ ok: true })
}
