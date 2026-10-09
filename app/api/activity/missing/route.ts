import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

function extractWorkDays(workDatesJson: string): number[] {
  const raw = JSON.parse(workDatesJson ?? '[]')
  if (!Array.isArray(raw) || raw.length === 0) return []
  if (typeof raw[0] === 'number') return raw
  return raw.map((w: any) => w.day)
}

export interface MissingDay {
  user_id: number
  name: string
  day: number
  date: string
}

// シフト提出済みの稼働予定日のうち、行動表（daily_activity）に記入が無い日を抽出する
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const isManager = session.role === 'manager' || session.role === 'admin' || session.role === 'viewer'
  if (!isManager && session.role !== 'member') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  // member は自分のデータのみ閲覧可能（クライアント指定の userId を無視し強制的に自分に固定）
  const userIdParam = isManager ? searchParams.get('userId') : String(session.userId)

  const dateLike = `${year}-${String(month).padStart(2, '0')}-%`

  const [shiftRows, activityRows] = await Promise.all([
    dbQuery<{ user_id: number; name: string; work_dates: string }>(
      `SELECT s.user_id, u.name, s.work_dates
       FROM shifts s JOIN users u ON u.id = s.user_id
       WHERE s.year = $1 AND s.month = $2 AND u.role != 'viewer'
       ${userIdParam ? 'AND s.user_id = $3' : ''}`,
      userIdParam ? [year, month, Number(userIdParam)] : [year, month]
    ),
    dbQuery<{ user_id: number; date: string }>(
      `SELECT user_id, date FROM daily_activity
       WHERE date LIKE $1 AND work_hours IS NOT NULL AND work_hours != ''
       ${userIdParam ? 'AND user_id = $2' : ''}`,
      userIdParam ? [dateLike, Number(userIdParam)] : [dateLike]
    ),
  ])

  const enteredDaysByUser = new Map<number, Set<number>>()
  activityRows.forEach((r) => {
    const day = parseInt(r.date.slice(8, 10))
    if (!enteredDaysByUser.has(r.user_id)) enteredDaysByUser.set(r.user_id, new Set())
    enteredDaysByUser.get(r.user_id)!.add(day)
  })

  // 今月を閲覧中なら「今日まで」の分だけを未入力対象にする（未来日はまだ記入できないため）
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month
  const upToDay = isCurrentMonth ? today.getDate() : 32

  const missing: MissingDay[] = []
  shiftRows.forEach((s) => {
    const plannedDays = extractWorkDays(s.work_dates)
    const entered = enteredDaysByUser.get(s.user_id) ?? new Set()
    plannedDays
      .filter((d) => d <= upToDay && !entered.has(d))
      .forEach((d) => {
        missing.push({
          user_id: s.user_id,
          name: s.name,
          day: d,
          date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        })
      })
  })
  missing.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))

  return NextResponse.json({ missing, count: missing.length })
}
