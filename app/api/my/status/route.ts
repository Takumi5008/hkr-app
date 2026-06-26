import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne } from '@/lib/db'

function score(value: number, max: number): number {
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)))
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 3) return 0
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  const num = xs.reduce((s, v, i) => s + (v - mx) * (ys[i] - my), 0)
  const dx = Math.sqrt(xs.reduce((s, v) => s + (v - mx) ** 2, 0))
  const dy = Math.sqrt(ys.reduce((s, v) => s + (v - my) ** 2, 0))
  if (dx === 0 || dy === 0) return 0
  return Math.round((num / (dx * dy)) * 100) / 100
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const isManager = session.role === 'manager' || session.role === 'admin' || session.role === 'viewer'
  const targetUserId = isManager && searchParams.get('userId')
    ? parseInt(searchParams.get('userId')!)
    : session.userId as number

  const nowJST = new Date(Date.now() + 9 * 3600_000)
  const curYear = nowJST.getUTCFullYear()
  const curMonth = nowJST.getUTCMonth() + 1
  const todayDay = nowJST.getUTCDate()

  // 過去6ヶ月分の月リスト
  const months: { year: number; month: number; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(curYear, curMonth - 1 - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: `${d.getMonth() + 1}月` })
  }

  const startKey = months[0].year * 100 + months[0].month
  const endKey = curYear * 100 + curMonth

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
    [targetUserId, startKey, endKey]
  )
  const recordsMap = new Map(recordsRows.map(r => [`${r.year}-${r.month}`, r]))

  // 月別稼働日数（daily_activity の日付数）— monthlyHistory より先に取得
  const sixMonthsAgo = `${months[0].year}-${String(months[0].month).padStart(2, '0')}-01`
  const workDaysRows = await dbQuery<{ yr: number; mo: number; work_days: number }>(
    `SELECT EXTRACT(YEAR FROM date::date)::int AS yr,
            EXTRACT(MONTH FROM date::date)::int AS mo,
            COUNT(DISTINCT date)::int AS work_days
     FROM daily_activity
     WHERE user_id = $1 AND date >= $2
     GROUP BY yr, mo`,
    [targetUserId, sixMonthsAgo]
  )
  const workDaysMap = new Map(workDaysRows.map(r => [`${r.yr}-${r.mo}`, r.work_days]))

  // 月次履歴組み立て
  const monthlyHistory = months.map(m => {
    const r = recordsMap.get(`${m.year}-${m.month}`)
    const cancel = r?.cancel_count ?? 0
    const activation = r?.activation_count ?? 0
    const hkr = cancel > 0 ? Math.round((activation / cancel) * 1000) / 10 : null
    const workDays = workDaysMap.get(`${m.year}-${m.month}`) ?? 0
    const productivity = workDays > 0 ? Math.round((activation / workDays) * 100) / 100 : null
    return { ...m, activation, cancel, hkr, workDays, productivity }
  })

  // パラメーター計算
  const recent3 = monthlyHistory.slice(-3)
  const avgActivation = recent3.reduce((s, m) => s + m.activation, 0) / 3
  const hkrValues = recent3.filter(m => m.hkr !== null).map(m => m.hkr as number)
  const avgHKR = hkrValues.length > 0 ? hkrValues.reduce((s, v) => s + v, 0) / hkrValues.length : 0

  // ピンポン変換率（直近3ヶ月の合計ベース: 獲得数 ÷ PP数）
  const threeMonthsAgo = `${months[2].year}-${String(months[2].month).padStart(2, '0')}-01`
  const [activityRows, cancelStatusRows] = await Promise.all([
    dbQuery<{ pingpong: number; acquired: number; cancel_count: number }>(
      `SELECT COALESCE(SUM(pingpong_count), 0)::int AS pingpong,
              COALESCE(SUM(wimax + sonet), 0)::int AS acquired,
              COALESCE(SUM(cancel), 0)::int AS cancel_count
       FROM daily_activity WHERE user_id = $1 AND date >= $2`,
      [targetUserId, threeMonthsAgo]
    ),
    dbQuery<{ total: number; cancelled: number }>(
      `SELECT COUNT(*)::int AS total,
              COUNT(CASE WHEN activation = '×' THEN 1 END)::int AS cancelled
       FROM activation_records
       WHERE user_id = $1 AND (year * 100 + month) >= $2 AND (year * 100 + month) <= $3`,
      [targetUserId, startKey, endKey]
    ),
  ])

  const totalPingpong = activityRows[0]?.pingpong ?? 0
  const totalAcquired = activityRows[0]?.acquired ?? 0
  const totalActivityCancel = activityRows[0]?.cancel_count ?? 0
  const ppConversionRate = totalPingpong > 0 ? (totalAcquired / totalPingpong) * 100 : 0

  // 早期非キャンセル率 = 開通表で❌（activation='×'）の件数 ÷ 全件数
  const cancelTotal = cancelStatusRows[0]?.total ?? 0
  const cancelCancelled = cancelStatusRows[0]?.cancelled ?? 0
  const avgEarlyCancelRate = cancelTotal > 0 ? (cancelCancelled / cancelTotal) * 100 : 0

  // 獲得数（月平均）= 行動表 wimax+sonet の3ヶ月平均
  const avgMonthlyAcquisition = totalAcquired / 3

  // 解除率 = 行動表の解除数 ÷ 獲得数 × 100
  const activityCancelRate = totalAcquired > 0 ? (totalActivityCancel / totalAcquired) * 100 : 0

  const avgCancel = recent3.reduce((s, m) => s + m.cancel, 0) / 3
  const thisM = monthlyHistory[monthlyHistory.length - 1].activation
  const thisMCancel = monthlyHistory[monthlyHistory.length - 1].cancel

  const params = {
    acquisition:  score(avgMonthlyAcquisition, 20),
    activity:     score(ppConversionRate, 1),
    cancel:       score(avgCancel, 15),
    cancelRatio:  score(activityCancelRate, 100),
    followup:     Math.max(0, Math.round(100 - avgEarlyCancelRate)),
    activation:   score(avgActivation, 10),
    hkr:          score(avgHKR, 80),
  }

  const rawData = {
    avgMonthlyActivation: Math.round(avgActivation * 10) / 10,
    avgMonthlyCancel: Math.round(avgCancel * 10) / 10,
    hkrAvg: Math.round(avgHKR * 10) / 10,
    ppConversionRate: Math.round(ppConversionRate * 10) / 10,
    totalPingpong,
    totalAcquired,
    earlyCancelRate: Math.round(avgEarlyCancelRate * 10) / 10,
    earlyCancelTotal: cancelTotal,
    earlyCancelCancelled: cancelCancelled,
    avgMonthlyAcquisition: Math.round(avgMonthlyAcquisition * 10) / 10,
    activityCancelRate: Math.round(activityCancelRate * 10) / 10,
    totalActivityCancel,
    thisMonthCancel: thisMCancel,
    thisMonthActivation: thisM,
    thisMonthHKR: thisMCancel > 0 ? Math.round((thisM / thisMCancel) * 1000) / 10 : null,
    thisMonthWorkDays: workDaysMap.get(`${curYear}-${curMonth}`) ?? 0,
    thisMonthProductivity: (() => {
      const wd = workDaysMap.get(`${curYear}-${curMonth}`) ?? 0
      return wd > 0 ? Math.round((thisM / wd) * 100) / 100 : null
    })(),
  }

  const paramLabels: Record<string, { label: string; action: string }> = {
    activation:  { label: '開通力', action: '月の開通ペースを上げよう。1日の訪問・提案数を意識的に増やすことから始めて。' },
    cancel:      { label: '解除量', action: '担当解除数が少ない。新規顧客の獲得を増やして解除件数を増やすことが成長の土台になる。' },
    hkr:         { label: '定着率(HKR)', action: '解除防止トークを見直そう。week_afterフォローをしっかり実施することが効果的。' },
    activity:    { label: 'PP変換率', action: 'ピンポンから獲得につなげる提案力を磨こう。ピンポン後のトークを見直して変換率1%以上（100PPで1件）を目指して。' },
    followup:    { label: '早期非キャンセル率', action: '獲得翌月に解除されている件数が多い。契約後のフォローを強化して早期解除を防ごう。' },
    acquisition: { label: '獲得数', action: '行動表の獲得数（WiMAX+So-net）が少ない。PP変換率を上げて月3件以上の獲得を目指そう。' },
    cancelRatio: { label: '解除率', action: '獲得時に旧回線の解除も取れているか。獲得した件数と同数の解除（100%）を目標に、セット提案を意識しよう。' },
  }

  const challenges = Object.entries(params)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([key, s]) => ({ key, score: s, ...paramLabels[key] }))

  // ① ペース管理
  const daysInMonth = new Date(curYear, curMonth, 0).getDate()
  const daysElapsed = Math.max(1, todayDay)
  const daysRemaining = Math.max(0, daysInMonth - todayDay)
  const dailyPace = Math.round((thisM / daysElapsed) * 10) / 10
  const projectedActivation = Math.round(dailyPace * daysInMonth)
  const pace = { thisMonthActivation: thisM, projectedActivation, daysElapsed, daysRemaining, totalDays: daysInMonth, dailyPace }

  // ④ 行動→開通の相関スコア（月次集計）
  const activityMonthlyRows = await dbQuery<{
    yr: number; mo: number; pin: number; pingpong: number; intercom: number; face: number; wimax: number; sonet: number
  }>(
    `SELECT EXTRACT(YEAR FROM date::date)::int AS yr,
            EXTRACT(MONTH FROM date::date)::int AS mo,
            COALESCE(SUM(pin_count),0)::int AS pin,
            COALESCE(SUM(pingpong_count),0)::int AS pingpong,
            COALESCE(SUM(intercom_count),0)::int AS intercom,
            COALESCE(SUM(face_other),0)::int AS face,
            COALESCE(SUM(wimax),0)::int AS wimax,
            COALESCE(SUM(sonet),0)::int AS sonet
     FROM daily_activity
     WHERE user_id = $1 AND date >= $2
     GROUP BY yr, mo`,
    [targetUserId, `${months[0].year}-${String(months[0].month).padStart(2, '0')}-01`]
  )
  const actMap = new Map(activityMonthlyRows.map(r => [`${r.yr}-${r.mo}`, r]))
  const activationSeries = months.map(m => recordsMap.get(`${m.year}-${m.month}`)?.activation_count ?? 0)
  const actKeys: { key: string; label: string; field: keyof typeof activityMonthlyRows[0] }[] = [
    { key: 'pin',      label: 'ピン数',        field: 'pin' },
    { key: 'pingpong', label: 'ピンポン数',     field: 'pingpong' },
    { key: 'intercom', label: 'インターホン数', field: 'intercom' },
    { key: 'face',     label: '対面数',         field: 'face' },
    { key: 'wimax',    label: 'WiMAX獲得',     field: 'wimax' },
    { key: 'sonet',    label: 'So-net獲得',    field: 'sonet' },
  ]
  const correlation = actKeys
    .map(({ key, label, field }) => {
      const series = months.map(m => (actMap.get(`${m.year}-${m.month}`)?.[field] as number) ?? 0)
      return { key, label, corr: pearson(series, activationSeries) }
    })
    .sort((a, b) => b.corr - a.corr)

  // ⑤ 振り返りと成長連動
  const reviewRows = await dbQuery<{
    year: number; month: number; challenges: string; next_goals: string
  }>(
    `SELECT year, month, challenges, next_goals FROM monthly_reviews
     WHERE user_id = $1 AND (year * 100 + month) >= $2 AND (year * 100 + month) < $3
     ORDER BY year ASC, month ASC`,
    [targetUserId, startKey, endKey]
  )
  const reviewGrowth = months.slice(0, 5).map((m, i) => {
    const rev = reviewRows.find(r => r.year === m.year && r.month === m.month)
    if (!rev || !rev.challenges) return null
    const thisActivation = monthlyHistory[i]?.activation ?? 0
    const nextActivation = monthlyHistory[i + 1]?.activation ?? null
    const improvement = nextActivation !== null ? nextActivation - thisActivation : null
    return { label: m.label, challenge: rev.challenges.slice(0, 120), nextGoal: rev.next_goals?.slice(0, 80) ?? '', activation: thisActivation, nextActivation, improvement }
  }).filter(Boolean)

  // 育成比較（チーム全員の月次履歴）
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
    [startKey, endKey]
  )

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

  const members = [...memberMap.entries()].map(([uid, { name, data }]) => ({
    userId: uid,
    name,
    isMe: uid === targetUserId,
    history: months.map(m => data[`${m.year}-${m.month}`] ?? 0),
  }))

  return NextResponse.json({ params, rawData, challenges, monthlyHistory, teamGrowth, members, pace, correlation, reviewGrowth })
}
