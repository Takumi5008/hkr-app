import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const url = new URL(req.url)
  const year = parseInt(url.searchParams.get('year') ?? '2026')
  const month = parseInt(url.searchParams.get('month') ?? '7')

  // 前月（実績参照月）
  const refYear = month === 1 ? year - 1 : year
  const refMonth = month === 1 ? 12 : month - 1
  const refPrefix = `${refYear}-${String(refMonth).padStart(2, '0')}-`

  const [users, activityRows, recordsRows, targetsRows] = await Promise.all([
    dbQuery<{ id: number; name: string; position: string }>(
      `SELECT id, name, COALESCE(position, '') AS position
       FROM users
       WHERE is_active = true AND role NOT IN ('viewer', 'shift_viewer')
       ORDER BY display_order, name`,
      []
    ),
    // 前月の行動表: 獲得・解除の合計と稼働日数
    dbQuery<{ user_id: number; total_acquired: number; total_cancel: number; work_days: number }>(
      `SELECT user_id,
              COALESCE(SUM(wimax + sonet), 0)::int AS total_acquired,
              COALESCE(SUM(cancel), 0)::int        AS total_cancel,
              COUNT(DISTINCT date)::int             AS work_days
       FROM daily_activity
       WHERE date LIKE $1
       GROUP BY user_id`,
      [refPrefix + '%']
    ),
    // 前月の records: 開通数合計
    dbQuery<{ user_id: number; total_activation: number }>(
      `SELECT user_id, COALESCE(SUM(activation_count), 0)::int AS total_activation
       FROM records
       WHERE year = $1 AND month = $2
       GROUP BY user_id`,
      [refYear, refMonth]
    ),
    // 保存済み目標
    dbQuery<{ user_id: number; work_days: number; acquisition_target: number; cancel_target: number; activation_target: number }>(
      `SELECT user_id, work_days, acquisition_target, cancel_target, activation_target
       FROM monthly_targets
       WHERE year = $1 AND month = $2`,
      [year, month]
    ),
  ])

  const actMap = new Map(activityRows.map(r => [r.user_id, r]))
  const recMap = new Map(recordsRows.map(r => [r.user_id, r]))
  const tgtMap = new Map(targetsRows.map(r => [r.user_id, r]))

  const members = users.map(u => {
    const act = actMap.get(u.id)
    const rec = recMap.get(u.id)
    const tgt = tgtMap.get(u.id)

    const refWorkDays = act?.work_days ?? 0
    const refAcquired = act?.total_acquired ?? 0
    const refCancel = act?.total_cancel ?? 0
    const refActivation = rec?.total_activation ?? 0

    const dailyAcq    = refWorkDays > 0 ? refAcquired   / refWorkDays : 0
    const dailyCancel = refWorkDays > 0 ? refCancel      / refWorkDays : 0
    const dailyAct    = refWorkDays > 0 ? refActivation  / refWorkDays : 0

    return {
      userId:    u.id,
      name:      u.name,
      position:  u.position,
      // 前月実績
      refWorkDays,
      refAcquired,
      refCancel,
      refActivation,
      dailyAcq:    Math.round(dailyAcq * 100) / 100,
      dailyCancel: Math.round(dailyCancel * 100) / 100,
      dailyAct:    Math.round(dailyAct * 100) / 100,
      // 保存済み目標（未保存なら 0）
      workDays:          tgt?.work_days ?? 0,
      acquisitionTarget: tgt?.acquisition_target ?? 0,
      cancelTarget:      tgt?.cancel_target ?? 0,
      activationTarget:  tgt?.activation_target ?? 0,
    }
  })

  return NextResponse.json({ members, year, month, refYear, refMonth })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const [userRow] = await dbQuery<{ role: string }>(`SELECT role FROM users WHERE id = $1`, [session.userId])
  if (!['manager', 'admin'].includes(userRow?.role ?? '')) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const body = await req.json()
  const { year, month, targets } = body as {
    year: number; month: number
    targets: { userId: number; workDays: number; acquisitionTarget: number; cancelTarget: number; activationTarget: number }[]
  }

  for (const t of targets) {
    await dbQuery(
      `INSERT INTO monthly_targets (user_id, year, month, work_days, acquisition_target, cancel_target, activation_target)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, year, month) DO UPDATE SET
         work_days = $4, acquisition_target = $5, cancel_target = $6, activation_target = $7`,
      [t.userId, year, month, t.workDays, t.acquisitionTarget, t.cancelTarget, t.activationTarget]
    )
  }

  return NextResponse.json({ ok: true })
}
