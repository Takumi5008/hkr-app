import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

// デバッグ: タカハシ様の activation_records と opening_calendar を確認
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const isAdmin = session.role === 'admin' || session.role === 'manager'
  if (!isAdmin) return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') ?? 'タカハシ'

  const activations = await dbQuery(
    `SELECT id, user_id, type, name, date, delivery_date, delivery_date_done,
            year, month, activation, cancel
     FROM activation_records
     WHERE name ILIKE $1
     ORDER BY id DESC`,
    [`%${name}%`]
  )

  const calendar = await dbQuery(
    `SELECT id, user_id, activation_record_id, year, month, activation_date,
            customer_name, line_type, status, created_at
     FROM opening_calendar
     WHERE customer_name ILIKE $1
     ORDER BY id DESC`,
    [`%${name}%`]
  )

  return NextResponse.json({ activations, calendar })
}
