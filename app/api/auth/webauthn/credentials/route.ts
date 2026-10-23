import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

// 自分が登録した生体認証（パスキー）の一覧
export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const rows = await dbQuery<{ id: string; device_name: string; created_at: string; last_used_at: string }>(
    `SELECT id, device_name, created_at, last_used_at FROM webauthn_credentials
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [session.userId]
  )
  return NextResponse.json(rows)
}

// 自分の生体認証を削除
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id不足' }, { status: 400 })

  await dbRun('DELETE FROM webauthn_credentials WHERE id = $1 AND user_id = $2', [id, session.userId])
  return NextResponse.json({ ok: true })
}
