import { NextRequest, NextResponse } from 'next/server'
import { dbQuery, dbQueryOne, dbRun } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || String(session.userId)
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  if (String(userId) !== String(session.userId) && session.role === 'member') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let sql = 'SELECT * FROM records WHERE user_id = $1'
  const params: (string | number)[] = [userId]
  let idx = 2

  if (year) { sql += ` AND year = $${idx++}`; params.push(Number(year)) }
  if (month) { sql += ` AND month = $${idx++}`; params.push(Number(month)) }
  sql += ' ORDER BY year DESC, month DESC'

  const records = await dbQuery(sql, params)
  return NextResponse.json(records)
}

const POINTS_PER_ACTIVATION = 10

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { year, month, product, cancel_count, activation_count } = await req.json()

  const oldRecord = await dbQueryOne(
    'SELECT activation_count FROM records WHERE user_id = $1 AND year = $2 AND month = $3 AND product = $4',
    [session.userId, year, month, product]
  )
  const oldActivation: number = (oldRecord as any)?.activation_count ?? 0
  const delta = (activation_count ?? 0) - oldActivation

  await dbRun(`
    INSERT INTO records (user_id, year, month, product, cancel_count, activation_count, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    ON CONFLICT(user_id, year, month, product)
    DO UPDATE SET cancel_count = EXCLUDED.cancel_count,
                  activation_count = EXCLUDED.activation_count,
                  updated_at = TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  `, [session.userId, year, month, product, cancel_count ?? 0, activation_count ?? 0])

  if (delta !== 0) {
    await dbRun(
      `UPDATE users SET points = GREATEST(0, points + $1) WHERE id = $2`,
      [delta * POINTS_PER_ACTIVATION, session.userId]
    )
  }

  const record = await dbQueryOne(
    'SELECT * FROM records WHERE user_id = $1 AND year = $2 AND month = $3 AND product = $4',
    [session.userId, year, month, product]
  )

  return NextResponse.json(record)
}
