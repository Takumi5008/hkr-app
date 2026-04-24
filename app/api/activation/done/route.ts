import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbRun } from '@/lib/db'

const ALLOWED_FIELDS = [
  'fm', 'week_after', 'day_before_construction', 'construction_date',
  'day_before_delivery', 'delivery_date', 'week_after_delivery',
]

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { id, field, done } = await req.json()
  if (!ALLOWED_FIELDS.includes(field)) return NextResponse.json({ error: '不正なフィールド' }, { status: 400 })

  const col = `${field}_done`
  await dbRun(
    `UPDATE activation_records SET ${col} = $1 WHERE id = $2 AND user_id = $3`,
    [done ? 1 : 0, id, session.userId]
  )
  return NextResponse.json({ ok: true })
}
