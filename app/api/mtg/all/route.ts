import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

function getFridaysForMonth(year: number, month: number): string[] {
  const fridays: string[] = []
  const d = new Date(year, month - 1, 1)
  const daysUntilFriday = (5 - d.getDay() + 7) % 7
  d.setDate(1 + daysUntilFriday)
  while (d.getMonth() === month - 1) {
    fridays.push(`${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    d.setDate(d.getDate() + 7)
  }
  return fridays
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const dates = getFridaysForMonth(year, month)
  const members = await dbQuery('SELECT id, name FROM users WHERE role != $1 ORDER BY id', ['viewer'])
  const rows = await dbQuery('SELECT * FROM mtg_attendance WHERE date = ANY($1)', [dates])
  const map: Record<number, Record<string, any>> = {}
  rows.forEach((r) => {
    if (!map[r.user_id]) map[r.user_id] = {}
    map[r.user_id][r.date] = r
  })
  return NextResponse.json({ dates, members, map })
}
