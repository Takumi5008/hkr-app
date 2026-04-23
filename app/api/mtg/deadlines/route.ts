import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

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
  const dates = getFridays(8)
  const rows = await dbQuery('SELECT * FROM mtg_deadlines WHERE date = ANY($1)', [dates])
  const map: Record<string, string> = {}
  rows.forEach((r) => { map[r.date] = r.deadline_at })
  return NextResponse.json(map)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const { date, deadlineAt } = await req.json()
  if (!date || !deadlineAt) return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  await dbRun(
    `INSERT INTO mtg_deadlines (date, deadline_at) VALUES ($1, $2)
     ON CONFLICT (date) DO UPDATE SET deadline_at = $2`,
    [date, deadlineAt]
  )
  return NextResponse.json({ ok: true })
}
