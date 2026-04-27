import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun, dbQueryOne } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const rows = await dbQuery('SELECT * FROM point_items WHERE is_active = true ORDER BY cost ASC')
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const { name, description, cost } = await req.json()
  if (!name?.trim() || !cost || cost <= 0) {
    return NextResponse.json({ error: '名前とポイント数は必須です' }, { status: 400 })
  }
  await dbRun(
    `INSERT INTO point_items (name, description, cost) VALUES ($1, $2, $3)`,
    [name.trim(), description?.trim() ?? '', cost]
  )
  const rows = await dbQuery('SELECT * FROM point_items WHERE is_active = true ORDER BY cost ASC')
  return NextResponse.json(rows)
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const { id } = await req.json()
  await dbRun('UPDATE point_items SET is_active = false WHERE id = $1', [id])
  return NextResponse.json({ ok: true })
}
