import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { id } = await params
  await dbRun('DELETE FROM schedules WHERE id = $1 AND user_id = $2', [id, session.userId])
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { id } = await params
  const { title, date, startTime, endTime, memo } = await req.json()
  await dbRun(
    'UPDATE schedules SET title = $1, date = $2, start_time = $3, end_time = $4, memo = $5 WHERE id = $6 AND user_id = $7',
    [title, date, startTime || null, endTime || null, memo || '', id, session.userId]
  )
  const updated = await dbQuery('SELECT * FROM schedules WHERE id = $1', [id])
  return NextResponse.json(updated[0])
}
