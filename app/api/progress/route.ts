import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'
import { toInt } from '@/lib/parse'

function extractWorkDays(workDatesJson: string): number[] {
  const raw = JSON.parse(workDatesJson ?? '[]')
  if (!Array.isArray(raw) || raw.length === 0) return []
  if (typeof raw[0] === 'number') return raw
  return raw.map((w: any) => w.day)
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  // ロール修正：memberになっている場合にmanagerに戻す
  if (session.email === 'komotaku0508@gmail.com' && session.role === 'member') {
    await dbRun(`UPDATE users SET role = 'manager' WHERE id = $1`, [session.userId])
    session.role = 'manager'
    await session.save()
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const userId = searchParams.get('userId')
  const isManager = session.role === 'manager' || session.role === 'admin' || session.role === 'viewer'
  const targetUserId = isManager && userId ? parseInt(userId) : session.userId

  const dateLike = `${year}-${String(month).padStart(2, '0')}-%`

  const [progress, shift, deadline, activityRow] = await Promise.all([
    dbQuery('SELECT * FROM monthly_progress WHERE user_id = $1 AND year = $2 AND month = $3', [targetUserId, year, month]),
    dbQuery('SELECT work_dates FROM shifts WHERE user_id = $1 AND year = $2 AND month = $3', [targetUserId, year, month]),
    dbQuery('SELECT deadline_at FROM shift_deadlines WHERE year = $1 AND month = $2', [year, month]),
    dbQuery('SELECT COALESCE(SUM(cancel), 0)::int AS total FROM daily_activity WHERE user_id = $1 AND date LIKE $2', [targetUserId, dateLike]),
  ])

  // シフト管理の変更を常に優先反映。シフト未提出の場合のみ保存済みにフォールバック
  const shiftDays = shift[0] ? extractWorkDays(shift[0].work_dates) : []
  const savedDays = progress[0] ? extractWorkDays(progress[0].work_dates) : []
  const workDates = shiftDays.length > 0 ? shiftDays : savedDays

  const deadlineAt = deadline[0]?.deadline_at ?? null
  const deadlinePassed = deadlineAt ? new Date(deadlineAt) < new Date() : false
  const actualCancel: number = activityRow[0]?.total ?? 0

  return NextResponse.json({
    cancelTarget: progress[0]?.cancel_target ?? 0,
    actualCancel,
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
  const { year, month, cancelTarget, actualCancel, workDates, userId: bodyUserId } = await req.json()
  const safeTarget = toInt(cancelTarget)
  const safeActual = toInt(actualCancel)

  const isAdmin = session.role === 'manager' || session.role === 'admin'
  const targetUserId = isAdmin && bodyUserId ? parseInt(bodyUserId) : session.userId

  // 締切チェック（マネージャー・管理者は除外）
  if (!isAdmin) {
    const deadline = await dbQuery('SELECT deadline_at FROM shift_deadlines WHERE year = $1 AND month = $2', [year, month])
    const deadlineAt = deadline[0]?.deadline_at
    if (deadlineAt && new Date(deadlineAt) < new Date()) {
      // 稼働日の変更は拒否、目標・実績のみ更新可
      await dbRun(
        `INSERT INTO monthly_progress (user_id, year, month, cancel_target, actual_cancel, work_dates)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, year, month) DO UPDATE SET cancel_target = $4, actual_cancel = $5`,
        [targetUserId, year, month, safeTarget, safeActual, JSON.stringify(workDates)]
      )
      return NextResponse.json({ ok: true, workDateLocked: true })
    }
  }

  await dbRun(
    `INSERT INTO monthly_progress (user_id, year, month, cancel_target, actual_cancel, work_dates)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, year, month) DO UPDATE SET cancel_target = $4, actual_cancel = $5, work_dates = $6`,
    [targetUserId, year, month, safeTarget, safeActual, JSON.stringify(workDates)]
  )
  return NextResponse.json({ ok: true })
}
