import { NextRequest, NextResponse } from 'next/server'
import { dbQueryOne, dbRun } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, email } = await req.json()
  if (!name || !email) {
    return NextResponse.json({ error: '名前とメールアドレスを入力してください' }, { status: 400 })
  }

  const existing = await dbQueryOne('SELECT id FROM users WHERE email = $1 AND id != $2', [email, session.userId])
  if (existing) {
    return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 409 })
  }

  await dbRun('UPDATE users SET name = $1, email = $2 WHERE id = $3', [name, email, session.userId])

  session.name = name
  session.email = email
  await session.save()

  return NextResponse.json({ ok: true, name, email })
}
