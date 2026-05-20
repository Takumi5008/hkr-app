import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')
  if (!year || !month) return NextResponse.json({ error: 'year と month を指定してください' }, { status: 400 })

  const rows = await dbQuery('SELECT deadline_at FROM review_deadlines WHERE year = $1 AND month = $2', [year, month])
  return NextResponse.json({ deadlineAt: rows[0]?.deadline_at ?? null })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { year, month, deadlineAt } = await req.json()
  if (!year || !month || !deadlineAt) return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })

  await dbRun(
    `INSERT INTO review_deadlines (year, month, deadline_at) VALUES ($1, $2, $3)
     ON CONFLICT (year, month) DO UPDATE SET deadline_at = $3`,
    [year, month, deadlineAt]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { year, month } = await req.json()
  await dbRun('DELETE FROM review_deadlines WHERE year = $1 AND month = $2', [year, month])
  return NextResponse.json({ ok: true })
}
