import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'member') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const month = Number(searchParams.get('month') || new Date().getMonth() + 1)

  const db = getDb()
  const users = db.prepare('SELECT id, name, role FROM users ORDER BY name').all() as any[]
  const records = db.prepare(
    'SELECT * FROM records WHERE year = ? AND month = ?'
  ).all(year, month) as any[]

  const data = users.map((u) => {
    const userRecords = records.filter((r) => r.user_id === u.id)
    return { user: u, records: userRecords }
  })

  return NextResponse.json(data)
}
