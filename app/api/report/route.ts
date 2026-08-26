import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const isManager = session.role === 'manager' || session.role === 'admin' || session.role === 'viewer'
  if (!isManager) return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const nowJST = new Date(Date.now() + 9 * 3600_000)
  const curYear = nowJST.getUTCFullYear()
  const curMonth = nowJST.getUTCMonth() + 1

  // 先月
  const lastMonthDate = new Date(curYear, curMonth - 2, 1)
  const lastYear = lastMonthDate.getFullYear()
  const lastMonth = lastMonthDate.getMonth() + 1

  // 今週（月曜〜今日、JST）
  const dayOfWeek = nowJST.getUTCDay() // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(nowJST.getTime() - mondayOffset * 86_400_000)
  const weekStartStr = weekStart.toISOString().slice(0, 10)
  const todayStr = nowJST.toISOString().slice(0, 10)

  // 先週（先週月曜〜先週日曜）
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 86_400_000)
  const lastWeekEnd = new Date(weekStart.getTime() - 86_400_000)
  const lastWeekStartStr = lastWeekStart.toISOString().slice(0, 10)
  const lastWeekEndStr = lastWeekEnd.toISOString().slice(0, 10)

  // アクティブメンバー
  const usersRows = await dbQuery<{ id: number; name: string }>(
    `SELECT id, name FROM users WHERE is_active = true AND role NOT IN ('viewer','shift_viewer') ORDER BY display_order ASC, name ASC`,
    []
  )

  // 今月・先月の月次実績
  const monthlyRows = await dbQuery<{
    user_id: number; year: number; month: number; activation_count: number; cancel_count: number
  }>(
    `SELECT r.user_id, r.year, r.month,
            COALESCE(SUM(r.activation_count),0)::int AS activation_count,
            COALESCE(SUM(r.cancel_count),0)::int AS cancel_count
     FROM records r
     JOIN users u ON u.id = r.user_id
     WHERE u.is_active = true AND u.role NOT IN ('viewer','shift_viewer')
       AND ((r.year = $1 AND r.month = $2) OR (r.year = $3 AND r.month = $4))
     GROUP BY r.user_id, r.year, r.month`,
    [curYear, curMonth, lastYear, lastMonth]
  )

  // 今週・先週の行動量
  const weekActivityRows = await dbQuery<{
    user_id: number; week: string;
    pin: number; pingpong: number; intercom: number; face: number; wimax: number; sonet: number; cancel: number
  }>(
    `SELECT user_id,
            CASE WHEN date >= $1 THEN 'this' ELSE 'last' END AS week,
            COALESCE(SUM(pin_count),0)::int AS pin,
            COALESCE(SUM(pingpong_count),0)::int AS pingpong,
            COALESCE(SUM(intercom_count),0)::int AS intercom,
            COALESCE(SUM(face_other),0)::int AS face,
            COALESCE(SUM(wimax),0)::int AS wimax,
            COALESCE(SUM(sonet),0)::int AS sonet,
            COALESCE(SUM(cancel),0)::int AS cancel
     FROM daily_activity
     WHERE date >= $2 AND date <= $3
     GROUP BY user_id, week`,
    [weekStartStr, lastWeekStartStr, todayStr]
  )

  const memberStats = usersRows.map(u => {
    const thisMonthRec = monthlyRows.find(r => r.user_id === u.id && r.year === curYear && r.month === curMonth)
    const lastMonthRec = monthlyRows.find(r => r.user_id === u.id && r.year === lastYear && r.month === lastMonth)
    const thisWeekAct = weekActivityRows.find(r => r.user_id === u.id && r.week === 'this')
    const lastWeekAct = weekActivityRows.find(r => r.user_id === u.id && r.week === 'last')

    const thisMonthActivation = thisMonthRec?.activation_count ?? 0
    const lastMonthActivation = lastMonthRec?.activation_count ?? 0
    const thisMonthCancel = thisMonthRec?.cancel_count ?? 0
    const hkr = thisMonthCancel > 0 ? Math.round((thisMonthActivation / thisMonthCancel) * 1000) / 10 : null
    const monthGrowth = lastMonthActivation > 0
      ? Math.round(((thisMonthActivation - lastMonthActivation) / lastMonthActivation) * 100)
      : thisMonthActivation > 0 ? 100 : 0

    const thisWeekTotal = (thisWeekAct?.pin ?? 0) + (thisWeekAct?.pingpong ?? 0) + (thisWeekAct?.intercom ?? 0) + (thisWeekAct?.face ?? 0) + (thisWeekAct?.wimax ?? 0) + (thisWeekAct?.sonet ?? 0)
    const lastWeekTotal = (lastWeekAct?.pin ?? 0) + (lastWeekAct?.pingpong ?? 0) + (lastWeekAct?.intercom ?? 0) + (lastWeekAct?.face ?? 0) + (lastWeekAct?.wimax ?? 0) + (lastWeekAct?.sonet ?? 0)

    return {
      id: u.id,
      name: u.name,
      thisMonthActivation,
      lastMonthActivation,
      thisMonthCancel,
      hkr,
      monthGrowth,
      thisWeekActivity: {
        pin: thisWeekAct?.pin ?? 0,
        pingpong: thisWeekAct?.pingpong ?? 0,
        intercom: thisWeekAct?.intercom ?? 0,
        face: thisWeekAct?.face ?? 0,
        wimax: thisWeekAct?.wimax ?? 0,
        sonet: thisWeekAct?.sonet ?? 0,
        total: thisWeekTotal,
      },
      lastWeekActivityTotal: lastWeekTotal,
      weekGrowth: lastWeekTotal > 0 ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100) : thisWeekTotal > 0 ? 100 : 0,
    }
  })

  // チーム集計
  const teamThisMonth = memberStats.reduce((s, m) => s + m.thisMonthActivation, 0)
  const teamLastMonth = memberStats.reduce((s, m) => s + m.lastMonthActivation, 0)
  const teamThisWeek = memberStats.reduce((s, m) => s + m.thisWeekActivity.total, 0)
  const teamLastWeek = memberStats.reduce((s, m) => s + m.lastWeekActivityTotal, 0)

  // ランキング
  const activationRanking = [...memberStats].sort((a, b) => b.thisMonthActivation - a.thisMonthActivation)
  const activityRanking = [...memberStats].sort((a, b) => b.thisWeekActivity.total - a.thisWeekActivity.total)
  const needsSupport = memberStats
    .filter(m => m.thisMonthActivation < (teamThisMonth / memberStats.length) * 0.5)
    .sort((a, b) => a.thisMonthActivation - b.thisMonthActivation)

  return NextResponse.json({
    period: { year: curYear, month: curMonth, weekStart: weekStartStr, weekEnd: todayStr },
    team: {
      thisMonthTotal: teamThisMonth,
      lastMonthTotal: teamLastMonth,
      monthGrowth: teamLastMonth > 0 ? Math.round(((teamThisMonth - teamLastMonth) / teamLastMonth) * 100) : 0,
      thisWeekActivity: teamThisWeek,
      lastWeekActivity: teamLastWeek,
      weekGrowth: teamLastWeek > 0 ? Math.round(((teamThisWeek - teamLastWeek) / teamLastWeek) * 100) : 0,
      memberCount: memberStats.length,
    },
    members: memberStats,
    activationRanking,
    activityRanking,
    needsSupport,
  })
}
