import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  if (session.role !== 'admin') return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const rows = await dbQuery(
    `SELECT se.*, u.name AS user_name
     FROM school_events se
     JOIN users u ON u.id = se.user_id
     WHERE se.done = 0
     ORDER BY se.event_date ASC, u.display_order ASC, u.name ASC`
  )
  return NextResponse.json(rows)
}
