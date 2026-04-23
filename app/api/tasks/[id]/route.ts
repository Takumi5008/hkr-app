import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { done, title, dueDate } = await req.json()
  const existing = await dbQuery('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [params.id, session.userId])
  if (!existing[0]) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  if (done !== undefined) {
    const doneAt = done ? `TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')` : 'NULL'
    await dbRun(
      `UPDATE tasks SET done = $1, done_at = ${done ? `TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')` : 'NULL'} WHERE id = $2`,
      done ? [1, params.id] : [0, params.id]
    )
  }
  if (title !== undefined || dueDate !== undefined) {
    await dbRun(
      'UPDATE tasks SET title = COALESCE($1, title), due_date = $2 WHERE id = $3',
      [title ?? existing[0].title, dueDate ?? existing[0].due_date, params.id]
    )
  }
  const updated = await dbQuery('SELECT * FROM tasks WHERE id = $1', [params.id])
  return NextResponse.json(updated[0])
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  await dbRun('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [params.id, session.userId])
  return NextResponse.json({ ok: true })
}
