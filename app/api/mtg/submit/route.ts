import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne, dbRun } from '@/lib/db'
import { addPointTransaction } from '@/lib/points'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')
  if (!year || !month) return NextResponse.json({ error: 'year と month を指定してください' }, { status: 400 })
  const row = await dbQueryOne(
    'SELECT submitted_at FROM mtg_submissions WHERE user_id = $1 AND year = $2 AND month = $3',
    [session.userId, year, month]
  )
  return NextResponse.json({ submitted: !!row, submittedAt: row?.submitted_at ?? null })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { year, month, attendances, submitted } = await req.json()
  if (!year || !month || !Array.isArray(attendances)) {
    return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 })
  }

  // 期限チェック（メンバーのみ）
  if (session.role !== 'manager' && session.role !== 'admin') {
    const deadline = await dbQueryOne(
      'SELECT deadline_at FROM mtg_month_deadlines WHERE year = $1 AND month = $2',
      [year, month]
    )
    if (deadline?.deadline_at && new Date(deadline.deadline_at) < new Date()) {
      return NextResponse.json({ error: '提出期限が終了しています' }, { status: 403 })
    }
  }

  // 欠席・遅刻理由チェック
  if (submitted) {
    const missingReason = attendances.filter((a: any) => (a.status === 'absent' || a.status === 'late') && !a.reason?.trim())
    if (missingReason.length > 0) {
      return NextResponse.json({ error: '欠席・遅刻の理由を入力してください' }, { status: 400 })
    }
  }

  // 各日程を保存
  for (const a of attendances) {
    if (!a.date || !['present', 'absent', 'late'].includes(a.status)) continue
    await dbRun(
      `INSERT INTO mtg_attendance (user_id, date, status, reason, late_time, updated_at)
       VALUES ($1, $2, $3, $4, $5, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
       ON CONFLICT (user_id, date) DO UPDATE SET status = $3, reason = $4, late_time = $5, updated_at = TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
      [session.userId, a.date, a.status, a.reason ?? '', a.lateTime ?? '']
    )
  }

  // 提出登録
  if (submitted) {
    await dbRun(
      `INSERT INTO mtg_submissions (user_id, year, month, submitted_at)
       VALUES ($1, $2, $3, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
       ON CONFLICT (user_id, year, month) DO UPDATE SET submitted_at = TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
      [session.userId, year, month]
    )
    await addPointTransaction(
      session.userId as number, 1, 'MTG出欠時間内提出', 'mtg_month_submit', `${year}-${month}`
    )
  }

  return NextResponse.json({ ok: true })
}
