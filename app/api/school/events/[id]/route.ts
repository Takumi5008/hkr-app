import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const id = parseInt(params.id)
  const body = await req.json()

  const fields: string[] = []
  const values: any[] = []
  let idx = 1

  if ('done' in body)       { fields.push(`done=$${idx++}`);       values.push(body.done) }
  if ('subject' in body)    { fields.push(`subject=$${idx++}`);    values.push(body.subject) }
  if ('event_date' in body) { fields.push(`event_date=$${idx++}`); values.push(body.event_date) }
  if ('memo' in body)       { fields.push(`memo=$${idx++}`);       values.push(body.memo) }

  if (fields.length === 0) return NextResponse.json({ error: '更新項目なし' }, { status: 400 })

  values.push(session.userId, id)
  await dbRun(
    `UPDATE school_events SET ${fields.join(', ')} WHERE user_id=$${idx} AND id=$${idx + 1}`,
    values
  )

  const rows = await dbQuery(
    `SELECT * FROM school_events WHERE user_id=$1 ORDER BY event_date ASC, created_at ASC`,
    [session.userId]
  )
  return NextResponse.json(rows)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const id = parseInt(params.id)
  await dbRun(`DELETE FROM school_events WHERE user_id=$1 AND id=$2`, [session.userId, id])

  const rows = await dbQuery(
    `SELECT * FROM school_events WHERE user_id=$1 ORDER BY event_date ASC, created_at ASC`,
    [session.userId]
  )
  return NextResponse.json(rows)
}
