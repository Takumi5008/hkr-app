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
  const threeMonthsAgo = `${months[0].year}-${String(months[0].month).padStart(2, '0')}-01`

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)

  const [usersRows, recordsRows, activityRows] = await Promise.all([
    dbQuery<{ id: number; name: string; created_at: string }>(
      `SELECT id, name, created_at FROM users
       WHERE is_active = true AND role NOT IN ('viewer','shift_viewer')
       ORDER BY created_at ASC`,
      []
    ),
    dbQuery<{ user_id: number; year: number; month: number; cancel_count: number; activation_count: number }>(
      `SELECT r.user_id, r.year, r.month,
              COALESCE(SUM(r.cancel_count),0)::int AS cancel_count,
              COALESCE(SUM(r.activation_count),0)::int AS activation_count
       FROM records r
       JOIN users u ON u.id = r.user_id
       WHERE u.is_active = true AND u.role NOT IN ('viewer','shift_viewer')
         AND (r.year * 100 + r.month) >= $1 AND (r.year * 100 + r.month) <= $2
       GROUP BY r.user_id, r.year, r.month`,
      [startKey, endKey]
    ),
    dbQuery<{ user_id: number; acquired: number; cancel_count: number }>(
      `SELECT user_id,
              COALESCE(SUM(wimax + sonet), 0)::int AS acquired,
              COALESCE(SUM(cancel), 0)::int AS cancel_count
       FROM daily_activity
       WHERE date >= $1
       GROUP BY user_id`,
      [threeMonthsAgo]
    ),
  ])

  const actMap = new Map(activityRows.map(r => [r.user_id, r]))

  const memberStats = usersRows.map(u => {
    const monthlyData = months.map(m => {
      const r = recordsRows.find(r => r.user_id === u.id && r.year === m.year && r.month === m.month)
      return { activation: r?.activation_count ?? 0, cancel: r?.cancel_count ?? 0 }
    })
    const avgActivation = monthlyData.reduce((s, m) => s + m.activation, 0) / 3
    const avgCancel = monthlyData.reduce((s, m) => s + m.cancel, 0) / 3
    const cancelValues = monthlyData.filter(m => m.cancel > 0)
    const avgHKR = cancelValues.length > 0
      ? cancelValues.reduce((s, m) => s + (m.activation / m.cancel) * 100, 0) / cancelValues.length : 0
    const act = actMap.get(u.id)
    const totalAcquired = act?.acquired ?? 0
    const totalActivityCancel = act?.cancel_count ?? 0
    const avgMonthlyAcquisition = totalAcquired / 3
    const activityCancelRate = totalAcquired > 0 ? (totalActivityCancel / totalAcquired) * 100 : 0
    const isNew = new Date(u.created_at) >= new Date(ninetyDaysAgo)

    const scores = {
      acquisition: score(avgMonthlyAcquisition, 20),
      activation:  score(avgActivation, 10),
      cancel:      score(avgCancel, 15),
      hkr:         score(avgHKR, 80),
      cancelRatio: score(activityCancelRate, 100),
    }
    const totalScore = Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / 5)

    return {
      id: u.id,
      name: u.name,
      isNew,
      joinedAt: u.created_at?.slice(0, 10) ?? '',
      avgActivation: Math.round(avgActivation * 10) / 10,
      hkrAvg: Math.round(avgHKR * 10) / 10,
      avgMonthlyAcquisition: Math.round(avgMonthlyAcquisition * 10) / 10,
      activityCancelRate: Math.round(activityCancelRate * 10) / 10,
      monthlyActivations: monthlyData.map(m => m.activation),
      scores,
      totalScore,
      needsSupport: totalScore < 40,
      monthLabels: months.map(m => `${m.month}月`),
    }
  })

  const teamAvgActivation = memberStats.length > 0
    ? Math.round(memberStats.reduce((s, m) => s + m.avgActivation, 0) / memberStats.length * 10) / 10 : 0
  const newMembers = memberStats.filter(m => m.isNew)
  const veterans = memberStats.filter(m => !m.isNew)

  return NextResponse.json({ members: memberStats, newMembers, veterans, teamAvgActivation })
}
