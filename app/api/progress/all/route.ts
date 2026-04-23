import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  const members = await dbQuery(
    "SELECT id, name FROM users WHERE role != 'viewer' ORDER BY id",
    []
  )
  const progresses = await dbQuery(
    'SELECT * FROM monthly_progress WHERE year = $1 AND month = $2',
    [year, month]
  )
  const progressMap: Record<number, any> = {}
  progresses.forEach((p) => { progressMap[p.user_id] = p })

  const result = members.map((m) => {
    const p = progressMap[m.id]
    return {
      id: m.id,
      name: m.name,
      cancelTarget: p?.cancel_target ?? 0,
      actualCancel: p?.actual_cancel ?? 0,
      workDates: JSON.parse(p?.work_dates ?? '[]'),
    }
  })

  return NextResponse.json(result)
}
