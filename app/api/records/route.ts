import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || String(session.userId)
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  // 自分以外のデータはmanager/viewerのみ
  if (String(userId) !== String(session.userId) && session.role === 'member') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getDb()
  let query = 'SELECT * FROM records WHERE user_id = ?'
  const params: (string | number)[] = [userId]

  if (year) { query += ' AND year = ?'; params.push(Number(year)) }
  if (month) { query += ' AND month = ?'; params.push(Number(month)) }
  query += ' ORDER BY year DESC, month DESC'

  const records = db.prepare(query).all(...params)
  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { year, month, product, cancel_count, activation_count } = await req.json()

  const db = getDb()
  db.prepare(`
    INSERT INTO records (user_id, year, month, product, cancel_count, activation_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, year, month, product)
    DO UPDATE SET cancel_count = excluded.cancel_count,
                  activation_count = excluded.activation_count,
                  updated_at = datetime('now')
  `).run(session.userId, year, month, product, cancel_count ?? 0, activation_count ?? 0)

  const record = db.prepare(
    'SELECT * FROM records WHERE user_id = ? AND year = ? AND month = ? AND product = ?'
  ).get(session.userId, year, month, product)

  return NextResponse.json(record)
}
