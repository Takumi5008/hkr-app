import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const rows = await dbQuery('SELECT * FROM member_performance ORDER BY sort_order ASC, id ASC', [])
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const { name, activationTarget, cancelTarget, workDaysTarget, periodStart, periodEnd, totalWork, totalActivation, totalCancel, note, sortOrder } = await req.json()
  const result = await dbRun(
    `INSERT INTO member_performance
     (name, activation_target, cancel_target, work_days_target, period_start, period_end, total_work, total_activation, total_cancel, note, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [name, activationTarget ?? 0, cancelTarget ?? 0, workDaysTarget ?? 0, periodStart ?? '', periodEnd ?? '', totalWork ?? 0, totalActivation ?? 0, totalCancel ?? 0, note ?? '', sortOrder ?? 0]
  )
  const row = await dbQuery('SELECT * FROM member_performance WHERE id = $1', [result.id])
  return NextResponse.json(row[0])
}
