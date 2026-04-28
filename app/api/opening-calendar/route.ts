import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun, dbQueryOne } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year  = parseInt(searchParams.get('year')  ?? '0')
  const month = parseInt(searchParams.get('month') ?? '0')

  const rows = await dbQuery(
    'SELECT * FROM opening_calendar WHERE user_id = $1 AND year = $2 AND month = $3 ORDER BY created_at ASC',
    [session.userId, year, month]
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { year, month, activation_date, customer_name, line_type, has_construction, status } = await req.json()
  const row = await dbQueryOne(
    `INSERT INTO opening_calendar (user_id, year, month, activation_date, customer_name, line_type, has_construction, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [session.userId, year, month, activation_date ?? '', customer_name ?? '', line_type ?? '', has_construction ?? false, status ?? '']
  )
  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { id, activation_date, customer_name, line_type, has_construction, status } = await req.json()
  await dbRun(
    `UPDATE opening_calendar
     SET activation_date = $1, customer_name = $2, line_type = $3, has_construction = $4, status = $5
     WHERE id = $6 AND user_id = $7`,
    [activation_date, customer_name, line_type, has_construction, status, id, session.userId]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get('id') ?? '0')
  await dbRun('DELETE FROM opening_calendar WHERE id = $1 AND user_id = $2', [id, session.userId])
  return NextResponse.json({ ok: true })
}
