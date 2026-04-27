import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbRun, dbQueryOne } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { avatar } = await req.json()
  if (!avatar || typeof avatar !== 'string') {
    return NextResponse.json({ error: '画像データが不正です' }, { status: 400 })
  }
  if (avatar.length > 600000) {
    return NextResponse.json({ error: '画像サイズが大きすぎます（最大400KB）' }, { status: 400 })
  }

  await dbRun('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, session.userId])
  const user = await dbQueryOne('SELECT avatar FROM users WHERE id = $1', [session.userId])
  return NextResponse.json({ avatar: (user as any)?.avatar })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  await dbRun('UPDATE users SET avatar = NULL WHERE id = $1', [session.userId])
  return NextResponse.json({ ok: true })
}
