import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'admin' && session.role !== 'viewer') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  // 在籍中メンバーに加えて、退会済みでも当月の目標・稼働予定が残っているメンバーも取得する。
  // 退会者は稼働人数・メンバー一覧には出さないが、目標件数はチーム合計に残したいケースがあるため。
  const members = await dbQuery(
    `SELECT id, name, is_active FROM users
     WHERE role != 'viewer'
       AND (is_active = true OR id IN (SELECT user_id FROM monthly_progress WHERE year = $1 AND month = $2))
     ORDER BY display_order, id`,
    [year, month]
  )
  const dateLike = `${year}-${String(month).padStart(2, '0')}-%`

  const [progresses, shifts, activities] = await Promise.all([
    dbQuery('SELECT * FROM monthly_progress WHERE year = $1 AND month = $2', [year, month]),
    dbQuery('SELECT user_id, work_dates FROM shifts WHERE year = $1 AND month = $2', [year, month]),
    dbQuery(
      `SELECT user_id, COALESCE(SUM(cancel), 0)::int AS total FROM daily_activity WHERE date LIKE $1 GROUP BY user_id`,
      [dateLike]
    ),
  ])

  const progressMap: Record<number, any> = {}
  progresses.forEach((p) => { progressMap[p.user_id] = p })

  const shiftMap: Record<number, number[]> = {}
  shifts.forEach((s) => {
    const raw = JSON.parse(s.work_dates ?? '[]')
    if (!Array.isArray(raw) || raw.length === 0) { shiftMap[s.user_id] = []; return }
    shiftMap[s.user_id] = typeof raw[0] === 'number' ? raw : raw.map((w: any) => w.day)
  })

  const cancelMap: Record<number, number> = {}
  activities.forEach((a) => { cancelMap[a.user_id] = a.total })

  const result = members.map((m) => {
    const p = progressMap[m.id]
    const savedDays: number[] = JSON.parse(p?.work_dates ?? '[]')
    const shiftDays: number[] = shiftMap[m.id] ?? []
    const workDates = shiftDays.length > 0 ? shiftDays : savedDays
    return {
      id: m.id,
      name: m.name,
      cancelTarget: p?.cancel_target ?? 0,
      actualCancel: cancelMap[m.id] ?? 0,
      workDates,
      hasRecord: !!p,
      isActive: m.is_active,
    }
  })

  return NextResponse.json(result)
}
