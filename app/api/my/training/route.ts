import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

function score(value: number, max: number): number {
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)))
}

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const isManager = session.role === 'manager' || session.role === 'admin' || session.role === 'viewer'
  if (!isManager) return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const nowJST = new Date(Date.now() + 9 * 3600_000)
  const curYear = nowJST.getUTCFullYear()
  const curMonth = nowJST.getUTCMonth() + 1

  // 過去3ヶ月リスト
  const months: { year: number; month: number }[] = []
  for (let i = 2; i >= 0; i--) {
    const d = new Date(curYear, curMonth - 1 - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  const startKey = months[0].year * 100 + months[0].month
  const endKey = curYear * 100 + curMonth

  // 全アクティブメンバー（新人判定: 90日以内）
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
  const usersRows = await dbQuery<{
    id: number; name: string; created_at: string; login_streak: number; login_count: number
  }>(
    `SELECT id, name, created_at, COALESCE(login_streak,0) AS login_streak, COALESCE(login_count,0) AS login_count
     FROM users
     WHERE is_active = true AND role NOT IN ('viewer','shift_viewer')
     ORDER BY created_at ASC`,
    []
  )

  // 月次実績
  const recordsRows = await dbQuery<{
    user_id: number; year: number; month: number; cancel_count: number; activation_count: number
  }>(
    `SELECT r.user_id, r.year, r.month,
            COALESCE(SUM(r.cancel_count),0)::int AS cancel_count,
            COALESCE(SUM(r.activation_count),0)::int AS activation_count
     FROM records r
     JOIN users u ON u.id = r.user_id
     WHERE u.is_active = true AND u.role NOT IN ('viewer','shift_viewer')
       AND (r.year * 100 + r.month) >= $1 AND (r.year * 100 + r.month) <= $2
     GROUP BY r.user_id, r.year, r.month`,
    [startKey, endKey]
  )

  // フォロー力
  const followRows = await dbQuery<{ user_id: number; total: number; filled: number }>(
    `SELECT user_id,
            COUNT(*)::int AS total,
            COUNT(CASE WHEN week_after IS NOT NULL AND week_after != '' AND week_after != '未定' THEN 1 END)::int AS filled
     FROM activation_records
     WHERE year * 100 + month >= $1
     GROUP BY user_id`,
    [startKey]
  )
  const followMap = new Map(followRows.map(r => [r.user_id, r]))

  // 行動量（直近30日）
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const activityRows = await dbQuery<{ user_id: number; avg_actions: number }>(
    `SELECT user_id,
            COALESCE(AVG(pin_count + pingpong_count + intercom_count + face_other + wimax + sonet), 0)::float AS avg_actions
     FROM daily_activity
     WHERE date >= $1
     GROUP BY user_id`,
    [thirtyDaysAgo]
  )
  const actMap = new Map(activityRows.map(r => [r.user_id, r.avg_actions]))

  // メンバーごとの集計
  const memberStats = usersRows.map(u => {
    const monthlyData = months.map(m => {
      const r = recordsRows.find(r => r.user_id === u.id && r.year === m.year && r.month === m.month)
      return { activation: r?.activation_count ?? 0, cancel: r?.cancel_count ?? 0 }
    })
    const avgActivation = monthlyData.reduce((s, m) => s + m.activation, 0) / 3
    const cancelValues = monthlyData.filter(m => m.cancel > 0)
    const avgHKR = cancelValues.length > 0
      ? cancelValues.reduce((s, m) => s + (m.activation / m.cancel) * 100, 0) / cancelValues.length : 0
    const followRow = followMap.get(u.id)
    const followupRate = (followRow?.total ?? 0) > 0 ? ((followRow?.filled ?? 0) / (followRow?.total ?? 1)) * 100 : 0
    const avgDailyActions = actMap.get(u.id) ?? 0
    const isNew = new Date(u.created_at) >= new Date(ninetyDaysAgo)

    const scores = {
      acquisition: score(avgActivation, 8),
      retention:   score(avgHKR, 80),
      activity:    score(avgDailyActions, 25),
      followup:    score(followupRate, 100),
      consistency: score(u.login_streak, 30),
    }
    const totalScore = Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / 5)

    return {
      id: u.id,
      name: u.name,
      isNew,
      joinedAt: u.created_at?.slice(0, 10) ?? '',
      loginStreak: u.login_streak,
      loginCount: u.login_count,
      monthlyActivations: monthlyData.map(m => m.activation),
      avgActivation: Math.round(avgActivation * 10) / 10,
      hkrAvg: Math.round(avgHKR * 10) / 10,
      followupRate: Math.round(followupRate),
      avgDailyActions: Math.round(avgDailyActions * 10) / 10,
      scores,
      totalScore,
      needsSupport: totalScore < 40,
      monthLabels: months.map(m => `${m.month}月`),
    }
  })

  // チーム平均
  const teamAvgActivation = memberStats.length > 0
    ? Math.round(memberStats.reduce((s, m) => s + m.avgActivation, 0) / memberStats.length * 10) / 10 : 0
  const newMembers = memberStats.filter(m => m.isNew)
  const veterans = memberStats.filter(m => !m.isNew)

  return NextResponse.json({ members: memberStats, newMembers, veterans, teamAvgActivation })
}
