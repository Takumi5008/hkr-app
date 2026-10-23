import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbRun } from '@/lib/db'
import { getDeadlineAt } from '@/lib/deadlines'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')
  if (!year || !month) return NextResponse.json({ deadlineAt: null })
  return NextResponse.json({ deadlineAt: await getDeadlineAt('shift', year, month) })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'admin') return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const { year, month, deadlineAt } = await req.json()
  if (!year || !month || !deadlineAt) return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  await dbRun(
    `INSERT INTO shift_deadlines (year, month, deadline_at) VALUES ($1, $2, $3)
     ON CONFLICT (year, month) DO UPDATE SET deadline_at = $3`,
    [year, month, deadlineAt]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'admin') return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const { year, month } = await req.json()
  await dbRun('DELETE FROM shift_deadlines WHERE year = $1 AND month = $2', [year, month])
  return NextResponse.json({ ok: true })
}
