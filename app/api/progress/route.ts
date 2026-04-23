import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

function extractWorkDays(workDatesJson: string): number[] {
  const raw = JSON.parse(workDatesJson ?? '[]')
  if (!Array.isArray(raw) || raw.length === 0) return []
  if (typeof raw[0] === 'number') return raw
  return raw.map((w: any) => w.day)
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  const [progress, shift, deadline] = await Promise.all([
    dbQuery('SELECT * FROM monthly_progress WHERE user_id = $1 AND year = $2 AND month = $3', [session.userId, year, month]),
    dbQuery('SELECT work_dates FROM shifts WHERE user_id = $1 AND year = $2 AND month = $3', [session.userId, year, month]),
    dbQuery('SELECT deadline_at FROM shift_deadlines WHERE year = $1 AND month = $2', [year, month]),
  ])

  // シフト日程をベースに、進捗側に保存済みなければシフトから自動反映
  const shiftDays = shift[0] ? extractWorkDays(shift[0].work_dates) : []
  const savedDays = progress[0] ? extractWorkDays(progress[0].work_dates) : null
  const workDates = savedDays !== null && savedDays.length > 0 ? savedDays : shiftDays

  const deadlineAt = deadline[0]?.deadline_at ?? null
  const deadlinePassed = deadlineAt ? new Date(deadlineAt) < new Date() : false

  return NextResponse.json({
    cancelTarget: progress[0]?.cancel_target ?? 0,
    actualCancel: progress[0]?.actual_cancel ?? 0,
    workDates,
    shiftDays,
    deadlineAt,
    deadlinePassed,
    role: session.role,
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { year, month, cancelTarget, actualCancel, workDates } = await req.json()

  // 締切チェック（マネージャーは除外）
  if (session.role !== 'manager') {
    const deadline = await dbQuery('SELECT deadline_at FROM shift_deadlines WHERE year = $1 AND month = $2', [year, month])
    const deadlineAt = deadline[0]?.deadline_at
    if (deadlineAt && new Date(deadlineAt) < new Date()) {
      // 稼働日の変更は拒否、目標・実績のみ更新可
      await dbRun(
        `INSERT INTO monthly_progress (user_id, year, month, cancel_target, actual_cancel, work_dates)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, year, month) DO UPDATE SET cancel_target = $4, actual_cancel = $5`,
        [session.userId, year, month, cancelTarget, actualCancel ?? 0, JSON.stringify(workDates)]
      )
      return NextResponse.json({ ok: true, workDateLocked: true })
    }
  }

  await dbRun(
    `INSERT INTO monthly_progress (user_id, year, month, cancel_target, actual_cancel, work_dates)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, year, month) DO UPDATE SET cancel_target = $4, actual_cancel = $5, work_dates = $6`,
    [session.userId, year, month, cancelTarget, actualCancel ?? 0, JSON.stringify(workDates)]
  )
  return NextResponse.json({ ok: true })
}
