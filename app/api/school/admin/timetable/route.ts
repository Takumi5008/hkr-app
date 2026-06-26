import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const isManager = session.role === 'manager' || session.role === 'viewer' || session.role === 'admin'
  if (!isManager) return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const rows = await dbQuery(
    `SELECT st.user_id, u.name AS user_name, st.day_of_week, st.period, st.subject
     FROM school_timetable st
     JOIN users u ON u.id = st.user_id
     ORDER BY u.display_order ASC, u.name ASC, st.day_of_week ASC, st.period ASC`
  )
  return NextResponse.json(rows)
}
