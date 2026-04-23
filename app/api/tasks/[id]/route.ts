import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { id } = await params
  const { done, title, dueDate } = await req.json()
  const existing = await dbQuery('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [id, session.userId])
  if (!existing[0]) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  if (done !== undefined) {
    if (done) {
      await dbRun(
        `UPDATE tasks SET done = 1, done_at = TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') WHERE id = $1`,
        [id]
      )
    } else {
      await dbRun('UPDATE tasks SET done = 0, done_at = NULL WHERE id = $1', [id])
    }
  }
  if (title !== undefined || dueDate !== undefined) {
    await dbRun(
      'UPDATE tasks SET title = COALESCE($1, title), due_date = $2 WHERE id = $3',
      [title ?? existing[0].title, dueDate ?? existing[0].due_date, id]
    )
  }
  const updated = await dbQuery('SELECT * FROM tasks WHERE id = $1', [id])
  return NextResponse.json(updated[0])
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { id } = await params
  await dbRun('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, session.userId])
  return NextResponse.json({ ok: true })
}
