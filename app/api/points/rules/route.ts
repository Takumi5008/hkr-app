import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const rows = await dbQuery('SELECT * FROM point_rules ORDER BY points DESC, id ASC')
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const { action, points } = await req.json()
  if (!action?.trim() || points === undefined || points === null || points === 0) {
    return NextResponse.json({ error: '内容とポイント（0以外）は必須です' }, { status: 400 })
  }
  await dbRun('INSERT INTO point_rules (action, points) VALUES ($1, $2)', [action.trim(), points])
  const rows = await dbQuery('SELECT * FROM point_rules ORDER BY points DESC, id ASC')
  return NextResponse.json(rows)
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const { id } = await req.json()
  await dbRun('DELETE FROM point_rules WHERE id = $1', [id])
  return NextResponse.json({ ok: true })
}
