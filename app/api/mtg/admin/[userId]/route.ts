import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbRun } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const { userId } = await params
  const { date, status, reason, lateTime } = await req.json()
  if (!date || !['present', 'absent', 'late'].includes(status)) {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }
  await dbRun(
    `INSERT INTO mtg_attendance (user_id, date, status, reason, late_time, updated_at)
     VALUES ($1, $2, $3, $4, $5, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
     ON CONFLICT (user_id, date) DO UPDATE SET status = $3, reason = $4, late_time = $5, updated_at = TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
    [userId, date, status, reason ?? '', lateTime ?? '']
  )
  return NextResponse.json({ ok: true })
}
