import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

function score(value: number, max: number): number {
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)))
}

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const nowJST = new Date(Date.now() + 9 * 3600_000)
  const curYear = nowJST.getUTCFullYear()
  const curMonth = nowJST.getUTCMonth() + 1

  const months: { year: number; month: number }[] = []
  for (let i = 2; i >= 0; i--) {
    const d = new Date(curYear, curMonth - 1 - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  const startKey = months[0].year * 100 + months[0].month
  const endKey = curYear * 100 + curMonth
  const threeMonthsAgo = `${months[0].year}-${String(months[0].month).padStart(2, '0')}-01`

  const [usersRows, recordsRows, activityRows, cancelStatusRows] = await Promise.all([
    dbQuery<{ id: number; name: string }>(
      `SELECT id, name FROM users
       WHERE is_active = true AND role NOT IN ('viewer','shift_viewer')
         AND name NOT IN ('理科大', '山﨑', '柴崎', '中島', 'とーけん')
       ORDER BY name ASC`,
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
    dbQuery<{ user_id: number; pingpong: number; acquired: number; cancel_count: number }>(
      `SELECT user_id,
              COALESCE(SUM(pingpong_count), 0)::int AS pingpong,
              COALESCE(SUM(wimax + sonet), 0)::int AS acquired,
              COALESCE(SUM(cancel), 0)::int AS cancel_count
       FROM daily_activity
       WHERE date >= $1
       GROUP BY user_id`,
      [threeMonthsAgo]
    ),
    dbQuery<{ user_id: number; total: number; cancelled: number }>(
      `SELECT user_id,
              COUNT(*)::int AS total,
              COUNT(CASE WHEN activation = '×' THEN 1 END)::int AS cancelled
       FROM activation_records
       WHERE (year * 100 + month) >= $1 AND (year * 100 + month) <= $2
       GROUP BY user_id`,
      [startKey, endKey]
    ),
  ])

  const actMap = new Map(activityRows.map(r => [r.user_id, r]))
  const cancelMap = new Map(cancelStatusRows.map(r => [r.user_id, r]))

  const ranking = usersRows.map(u => {
    const monthlyData = months.map(m => {
      const r = recordsRows.find(r => r.user_id === u.id && r.year === m.year && r.month === m.month)
      return { activation: r?.activation_count ?? 0, cancel: r?.cancel_count ?? 0 }
    })
    const avgActivation = monthlyData.reduce((s, m) => s + m.activation, 0) / 3
    const avgCancel = monthlyData.reduce((s, m) => s + m.cancel, 0) / 3
    const hkrValues = monthlyData.filter(m => m.cancel > 0).map(m => (m.activation / m.cancel) * 100)
    const avgHKR = hkrValues.length > 0 ? hkrValues.reduce((s, v) => s + v, 0) / hkrValues.length : 0

    const act = actMap.get(u.id)
    const totalPingpong = act?.pingpong ?? 0
    const totalAcquired = act?.acquired ?? 0
    const totalActivityCancel = act?.cancel_count ?? 0
    const avgMonthlyAcquisition = totalAcquired / 3
    const ppConversionRate = totalPingpong > 0 ? (totalAcquired / totalPingpong) * 100 : 0
    const activityCancelRate = totalAcquired > 0 ? (totalActivityCancel / totalAcquired) * 100 : 0

    const cs = cancelMap.get(u.id)
    const cancelTotal = cs?.total ?? 0
    const cancelCancelled = cs?.cancelled ?? 0
    const earlyCancelRate = cancelTotal > 0 ? (cancelCancelled / cancelTotal) * 100 : 0

    const params = {
      acquisition:  score(avgMonthlyAcquisition, 20),
      activity:     score(ppConversionRate, 1),
      cancel:       score(avgCancel, 15),
      cancelRatio:  score(activityCancelRate, 100),
      followup:     Math.max(0, Math.round(100 - earlyCancelRate)),
      activation:   score(avgActivation, 10),
      hkr:          score(avgHKR, 80),
    }
    const totalScore = Math.min(100, Math.round(Object.values(params).reduce((s, v) => s + v, 0) / 7))

    return { userId: u.id, name: u.name, totalScore, params }
  })

  ranking.sort((a, b) => b.totalScore - a.totalScore)
  const ranked = ranking.map((r, i) => ({ ...r, rank: i + 1 }))

  return NextResponse.json({ ranking: ranked, myUserId: session.userId })
}
