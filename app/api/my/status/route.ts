import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne } from '@/lib/db'

function score(value: number, max: number): number {
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)))
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const isManager = session.role === 'manager' || session.role === 'admin' || session.role === 'viewer'
  const targetUserId = isManager && searchParams.get('userId')
    ? parseInt(searchParams.get('userId')!)
    : session.userId as number

  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1

  // 過去6ヶ月分の月リスト
  const months: { year: number; month: number; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(curYear, curMonth - 1 - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: `${d.getMonth() + 1}月` })
  }

  // 月次開通/解除実績
  const recordsRows = await dbQuery<{
    year: number; month: number; cancel_count: number; activation_count: number
  }>(
    `SELECT year, month,
       COALESCE(SUM(cancel_count),0)::int AS cancel_count,
       COALESCE(SUM(activation_count),0)::int AS activation_count
     FROM records
     WHERE user_id = $1 AND (year * 100 + month) >= $2 AND (year * 100 + month) <= $3
     GROUP BY year, month`,
    [targetUserId, months[0].year * 100 + months[0].month, curYear * 100 + curMonth]
  )
  const recordsMap = new Map(recordsRows.map(r => [`${r.year}-${r.month}`, r]))

  // 月次履歴組み立て
  const monthlyHistory = months.map(m => {
    const r = recordsMap.get(`${m.year}-${m.month}`)
    const cancel = r?.cancel_count ?? 0
    const activation = r?.activation_count ?? 0
    const hkr = cancel > 0 ? Math.round((activation / cancel) * 1000) / 10 : null
    return { ...m, activation, cancel, hkr }
  })

  // パラメーター計算
  const recent3 = monthlyHistory.slice(-3)
  const avgActivation = recent3.reduce((s, m) => s + m.activation, 0) / 3
  const hkrValues = recent3.filter(m => m.hkr !== null).map(m => m.hkr as number)
  const avgHKR = hkrValues.length > 0 ? hkrValues.reduce((s, v) => s + v, 0) / hkrValues.length : 0

  // 行動量（直近30日の日次行動合計平均）
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)
  const activityRows = await dbQuery<{ total: number; cnt: number }>(
    `SELECT COALESCE(AVG(pin_count + pingpong_count + intercom_count + face_other + wimax + sonet), 0)::float AS total,
            COUNT(*)::int AS cnt
     FROM daily_activity
     WHERE user_id = $1 AND date >= $2`,
    [targetUserId, thirtyDaysAgo.toISOString().slice(0, 10)]
  )
  const avgDailyActions = activityRows[0]?.total ?? 0

  // フォロー力（week_after入力率）
  const followRows = await dbQuery<{ total: number; filled: number }>(
    `SELECT COUNT(*)::int AS total,
            COUNT(CASE WHEN week_after IS NOT NULL AND week_after != '' AND week_after != '未定' THEN 1 END)::int AS filled
     FROM activation_records
     WHERE user_id = $1 AND year * 100 + month >= $2`,
    [targetUserId, months[0].year * 100 + months[0].month]
  )
  const followupRate = followRows[0]?.total > 0
    ? (followRows[0].filled / followRows[0].total) * 100
    : 0

  // 継続力（ログインストリーク）
  const meRow = await dbQueryOne<{ login_streak: number }>(
    'SELECT COALESCE(login_streak, 0) AS login_streak FROM users WHERE id = $1',
    [targetUserId]
  )
  const loginStreak = meRow?.login_streak ?? 0

  // 成長速度（今月 vs 先月）
  const thisM = monthlyHistory[monthlyHistory.length - 1].activation
  const lastM = monthlyHistory[monthlyHistory.length - 2].activation
  const growthRate = lastM > 0 ? ((thisM - lastM) / lastM) * 100 : (thisM > 0 ? 100 : 0)

  const params = {
    acquisition: score(avgActivation, 8),
    retention:   score(avgHKR, 80),
    activity:    score(avgDailyActions, 25),
    followup:    score(followupRate, 100),
    consistency: score(loginStreak, 30),
    growth:      Math.min(100, Math.max(0, 50 + Math.round(growthRate / 2))),
  }

  const rawData = {
    avgMonthlyActivation: Math.round(avgActivation * 10) / 10,
    hkrAvg: Math.round(avgHKR * 10) / 10,
    avgDailyActions: Math.round(avgDailyActions * 10) / 10,
    followupRate: Math.round(followupRate),
    loginStreak,
    growthRate: Math.round(growthRate),
  }

  // 課題推薦（スコアが低い順に上位3つ）
  const paramLabels: Record<string, { label: string; action: string }> = {
    acquisition: { label: '獲得力', action: '月の獲得ペースを上げよう。1日の訪問・提案数を意識的に増やすことから始めて。' },
    retention:   { label: '定着力', action: '解除防止トークを見直そう。week_afterフォローをしっかり実施することが効果的。' },
    activity:    { label: '行動量', action: '1日のピン・インターホン数を5件増やすことを目標にしよう。量が質を生む。' },
    followup:    { label: 'フォロー力', action: '獲得した顧客への1週間後フォローを必ず実施しよう。開通率アップに直結する。' },
    consistency: { label: '継続力', action: '毎日の入力・ログイン習慣をつけよう。データが積み上がると改善点が見えてくる。' },
    growth:      { label: '成長速度', action: '先月より1件でも多く獲得することを意識しよう。小さな積み上げが大きな差になる。' },
  }

  const challenges = Object.entries(params)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([key, score]) => ({ key, score, ...paramLabels[key] }))

  // チーム全員の月次履歴（育成比較用）
  const allMembersRows = await dbQuery<{
    user_id: number; name: string; year: number; month: number;
    cancel_count: number; activation_count: number
  }>(
    `SELECT r.user_id, u.name, r.year, r.month,
            COALESCE(SUM(r.cancel_count),0)::int AS cancel_count,
            COALESCE(SUM(r.activation_count),0)::int AS activation_count
     FROM records r
     JOIN users u ON u.id = r.user_id
     WHERE u.is_active = true AND u.role NOT IN ('viewer','shift_viewer')
       AND (r.year * 100 + r.month) >= $1 AND (r.year * 100 + r.month) <= $2
     GROUP BY r.user_id, u.name, r.year, r.month`,
    [months[0].year * 100 + months[0].month, curYear * 100 + curMonth]
  )

  // メンバー別の月次履歴を整理
  const memberMap = new Map<number, { name: string; data: Record<string, number> }>()
  for (const row of allMembersRows) {
    if (!memberMap.has(row.user_id)) memberMap.set(row.user_id, { name: row.name, data: {} })
    memberMap.get(row.user_id)!.data[`${row.year}-${row.month}`] = row.activation_count
  }

  const teamGrowth = months.map(m => {
    const key = `${m.year}-${m.month}`
    const values = [...memberMap.values()].map(v => v.data[key] ?? 0)
    const teamAvg = values.length > 0 ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10 : 0
    const mine = memberMap.get(targetUserId)?.data[key] ?? 0
    return { ...m, mine, teamAvg }
  })

  // メンバー一覧（比較用）
  const members = [...memberMap.entries()].map(([uid, { name, data }]) => ({
    userId: uid,
    name,
    isMe: uid === targetUserId,
    history: months.map(m => data[`${m.year}-${m.month}`] ?? 0),
  }))

  return NextResponse.json({ params, rawData, challenges, monthlyHistory, teamGrowth, members })
}
