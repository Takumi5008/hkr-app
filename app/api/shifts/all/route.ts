import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'shift_viewer') return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')
  if (!year || !month) return NextResponse.json({ error: 'year と month を指定してください' }, { status: 400 })
  const members = await dbQuery('SELECT id, name FROM users WHERE role != $1 ORDER BY id', ['viewer'])
  const shifts = await dbQuery('SELECT * FROM shifts WHERE year = $1 AND month = $2', [year, month])
  const shiftMap: Record<number, any> = {}
  shifts.forEach((s) => {
    shiftMap[s.user_id] = { workDates: JSON.parse(s.work_dates), submitted: !!s.submitted }
  })
  return NextResponse.json(members.map((m) => ({
    id: m.id,
    name: m.name,
    workDates: shiftMap[m.id]?.workDates ?? [],
    submitted: shiftMap[m.id]?.submitted ?? false,
  })))
}
