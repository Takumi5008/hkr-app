import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

function getFridays(weeks = 8): string[] {
  const fridays: string[] = []
  const d = new Date()
  const diff = (5 - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  for (let i = 0; i < weeks; i++) {
    fridays.push(new Date(d).toISOString().slice(0, 10))
    d.setDate(d.getDate() + 7)
  }
  return fridays
}

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const dates = getFridays(8)
  const members = await dbQuery('SELECT id, name FROM users WHERE role != $1 ORDER BY id', ['viewer'])
  const rows = await dbQuery('SELECT * FROM mtg_attendance WHERE date = ANY($1)', [dates])
  const map: Record<number, Record<string, any>> = {}
  rows.forEach((r) => {
    if (!map[r.user_id]) map[r.user_id] = {}
    map[r.user_id][r.date] = r
  })
  return NextResponse.json({ dates, members, map })
}
