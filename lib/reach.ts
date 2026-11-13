// 78解除到達管理：集計と、未到達者の到達予測（過去の到達者データから）

export const REACH_TARGET = 78

export interface ReachMember {
  id: number
  name: string
  startDate: string        // 初稼働日 YYYY-MM-DD
  endDate: string | null   // 終了日（到達日 or 離脱日）。未設定なら挑戦中
  plannedEnd: string | null // 終了予定日（挑戦中の人）
  monthly: number[]        // 1ヶ月目, 2ヶ月目, ... の解除数
  challenger: boolean
  paused: boolean          // 稼働停止・休止中（予測の対象外）
  pauseStart: string | null  // 休止開始日（休んだ最初の日）
  resumeDate: string | null  // 再開日（未定なら null）
  grade: string            // 評価（A / C など）
  note: string
}

export type ReachStatus = 'reached' | 'dropped' | 'paused' | 'active'

export const statusOf = (m: Pick<ReachMember, 'endDate' | 'monthly' | 'paused'>): ReachStatus => {
  if (sum(m.monthly) >= REACH_TARGET) return 'reached'
  if (m.endDate) return 'dropped'
  return m.paused ? 'paused' : 'active'
}

export const sum = (a: number[]) => a.reduce((s, n) => s + n, 0)

// 累計が78に届いた月（nヶ月目）。届いていなければ null
export function reachMonthOf(monthly: number[]): number | null {
  let cum = 0
  for (let i = 0; i < monthly.length; i++) {
    cum += monthly[i]
    if (cum >= REACH_TARGET) return i + 1
  }
  return null
}

// 評価：4ヶ月以内に到達=S、365日以内に到達=A、365日を超えて到達=B、未達=C
// （日数は初稼働日から到達日まで。休止期間は含めない）
export type ReachGrade = 'S' | 'A' | 'B' | 'C'
export const GRADE_DAYS = 365
export const gradeFor = (reachMonth: number | null, reachDays: number | null): ReachGrade => {
  if (reachMonth === null || reachDays === null) return 'C'
  if (reachMonth <= 4) return 'S'
  return reachDays <= GRADE_DAYS ? 'A' : 'B'
}

// 到達者の到達日数（終了日=到達日。未入力なら今日まで）
export const reachDaysOf = (m: ReachMember, today: string): number | null =>
  reachMonthOf(m.monthly) === null ? null : elapsedDays(m, m.endDate ?? today)

export const gradeOf = (m: ReachMember, today: string): ReachGrade => gradeFor(reachMonthOf(m.monthly), reachDaysOf(m, today))

// "1.5.0,6.5" や "4、7 7" など、ドット・カンマ・読点・空白区切りの解除数を配列にする
export function parseMonthly(text: string): number[] | null {
  const half = text.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
  const parts = half.split(/[.,、。，．\s]+/).filter(Boolean)
  if (parts.length > 60) return null
  const nums = parts.map(p => (/^\d{1,3}$/.test(p) ? Number(p) : NaN))
  return nums.some(n => Number.isNaN(n)) ? null : nums
}

export const addDays = (d: string, n: number) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10)
}

// (i+1)ヶ月目の日数
const daysInPeriod = (startDate: string, i: number) =>
  (Date.parse(monthEnd(startDate, i + 1)) - Date.parse(monthEnd(startDate, i))) / 86400000

// 'YYYY-MM-DD' に nヶ月足した日の前日（= nヶ月目の最終日。n=0 なら初稼働日の前日）
export function monthEnd(startDate: string, n: number): string {
  const [y, m, d] = startDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1 + n, d - 1))
  return dt.toISOString().slice(0, 10)
}

// 休んだ日数の分だけ延ばした終了予定日
type PauseFields = Pick<ReachMember, 'pauseStart' | 'resumeDate'>
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)

// 休止日数（休止開始日〜再開日の前日）。再開日が未定なら今日までを数える
export const pausedDays = (m: PauseFields, today: string): number => {
  if (!m.pauseStart) return 0
  return Math.max(0, daysBetween(m.pauseStart, m.resumeDate ?? addDays(today, 1)))
}

export const effectivePlannedEnd = (m: Pick<ReachMember, 'plannedEnd'> & PauseFields, today: string): string | null =>
  m.plannedEnd ? addDays(m.plannedEnd, pausedDays(m, today)) : null

// 経過日数（初稼働日を1日目として今日まで数え、休止期間の日は含めない）
export const elapsedDays = (m: Pick<ReachMember, 'startDate'> & PauseFields, today: string): number => {
  const total = daysBetween(m.startDate, today) + 1
  if (!m.pauseStart || m.pauseStart > today) return Math.max(0, total)
  const pauseEnd = m.resumeDate && m.resumeDate <= today ? m.resumeDate : addDays(today, 1)
  return Math.max(0, total - daysBetween(m.pauseStart, pauseEnd))
}

export interface ReachCurve {
  reachers: number                // 到達者数
  avgMonthly: number[]            // 到達者の月別平均解除数（index 0 = 1ヶ月目）
  avgCumulative: number[]         // 上記の累計
  monthsToReach: { avg: number; median: number; min: number; max: number } | null
  tailAvg: number                 // データが少ない月に使う、到達者の7ヶ月目以降の平均
}

const MIN_SAMPLES = 3

// 到達者の月別平均カーブ。到達者が少ない月（3人未満）は後半平均で補う
export function buildCurve(members: ReachMember[]): ReachCurve {
  const reached = members.filter(m => statusOf(m) === 'reached')
  const tail = reached.flatMap(m => m.monthly.slice(6))
  const all = reached.flatMap(m => m.monthly)
  const tailAvg = tail.length > 0 ? sum(tail) / tail.length : all.length > 0 ? sum(all) / all.length : 0

  const maxLen = Math.max(0, ...reached.map(m => m.monthly.length))
  const avgMonthly: number[] = []
  for (let i = 0; i < Math.max(maxLen, 24); i++) {
    const vals = reached.filter(m => m.monthly.length > i).map(m => m.monthly[i])
    avgMonthly.push(vals.length >= MIN_SAMPLES ? sum(vals) / vals.length : tailAvg)
  }
  const avgCumulative = avgMonthly.reduce<number[]>((acc, v) => [...acc, (acc.at(-1) ?? 0) + v], [])

  const lens = reached.map(m => m.monthly.length).sort((a, b) => a - b)
  const monthsToReach = lens.length === 0 ? null : {
    avg: sum(lens) / lens.length,
    median: lens.length % 2 ? lens[(lens.length - 1) / 2] : (lens[lens.length / 2 - 1] + lens[lens.length / 2]) / 2,
    min: lens[0],
    max: lens[lens.length - 1],
  }
  return { reachers: reached.length, avgMonthly, avgCumulative, monthsToReach, tailAvg }
}

export interface ReachPrediction {
  months: number            // 経過月数（データのある月数）
  total: number             // 現在の累計
  remaining: number         // 残り
  paceRatio: number         // 到達者平均に対するペース（1.0 = 平均並み）
  aheadOfReachers: number   // 同じ月数時点の累計で上回っている到達者の割合（0〜1）
  similar: { name: string; reachDays: number; grade: ReachGrade } | null // 今のペースに一番近い過去の到達者
  grade: ReachGrade         // 見込み評価（到達予定日から）
  reachMonth: number | null // 到達見込みの月（nヶ月目）。36ヶ月以内に届かなければ null
  reachDate: string | null  // 到達見込み日（到達月の中で、78に届く位置を日割りで求めた日）
  withinPlan: boolean | null // 終了予定日までに届く見込みか
  neededPerMonth: number | null // 終了予定日までに必要な月平均
  projection: number[]      // 予測の累計（index 0 = 1ヶ月目、実績部分は実績）
}

// 到達予測：本人のペース比（到達者平均カーブとの比）で、到達者の今後の月別平均を伸ばす。
// 月数が少ないうちはブレが大きいので、到達者平均に寄せて（PRIOR 分の下駄）補正する。
const PRIOR = 10
const HORIZON = 36

export function predict(m: ReachMember, curve: ReachCurve, reachers: ReachMember[], today: string): ReachPrediction {
  const k = m.monthly.length
  const total = sum(m.monthly)
  const avgCum = k > 0 ? curve.avgCumulative[k - 1] ?? 0 : 0
  const paceRatio = Math.min(3, Math.max(0.1, (total + PRIOR) / (avgCum + PRIOR)))

  // 同じ月数時点で、自分の累計が上回っている到達者の割合
  const cmp = reachers.map(r => sum(r.monthly.slice(0, k)))
  const aheadOfReachers = cmp.length > 0 ? cmp.filter(c => total > c).length / cmp.length : 0

  // 1ヶ月目〜今月までの累計の推移が一番近い到達者（累計の差の二乗平均が最小）
  let similar: ReachPrediction['similar'] = null
  if (k > 0) {
    let best = Infinity
    for (const r of reachers) {
      let a = 0, b = 0, d = 0
      for (let i = 0; i < k; i++) {
        a += m.monthly[i]
        b += r.monthly[i] ?? 0
        d += (a - b) ** 2
      }
      if (d < best) {
        best = d
        similar = { name: r.name, reachDays: reachDaysOf(r, today)!, grade: gradeOf(r, today) }
      }
    }
  }

  const projection: number[] = []
  let cum = 0
  let reachMonth: number | null = total >= REACH_TARGET ? k : null
  let reachDate: string | null = null
  // 休んでいた期間の分だけ、先の月の日付を後ろにずらす
  const base = addDays(m.startDate, pausedDays(m, today))
  for (let i = 0; i < HORIZON; i++) {
    const v = i < k ? m.monthly[i] : paceRatio * (curve.avgMonthly[i] ?? curve.tailAvg)
    const prev = cum
    cum += v
    projection.push(Math.round(cum * 10) / 10)
    if (reachMonth === null && i >= k && cum >= REACH_TARGET) {
      reachMonth = i + 1
      // その月の何割の時点で78に届くかを日割りして日付にする
      reachDate = addDays(monthEnd(base, i), Math.max(1, Math.round(((REACH_TARGET - prev) / v) * daysInPeriod(base, i))))
    }
  }

  let neededPerMonth: number | null = null
  const plannedEnd = effectivePlannedEnd(m, today)
  if (plannedEnd && total < REACH_TARGET && plannedEnd >= today) {
    // 終了予定日までの残り月数（今月を含む、最低1ヶ月）
    const [ty, tm, td] = today.split('-').map(Number)
    const [py, pm, pd] = plannedEnd.split('-').map(Number)
    const left = Math.max(1, (py - ty) * 12 + (pm - tm) + (pd >= td ? 1 : 0))
    neededPerMonth = Math.round(((REACH_TARGET - total) / left) * 10) / 10
  }

  return {
    months: k,
    total,
    remaining: Math.max(0, REACH_TARGET - total),
    paceRatio: Math.round(paceRatio * 100) / 100,
    aheadOfReachers,
    similar,
    grade: gradeFor(reachMonth, reachDate ? elapsedDays(m, reachDate) : null),
    reachMonth,
    reachDate,
    withinPlan: plannedEnd ? (reachDate !== null && reachDate <= plannedEnd) : null,
    neededPerMonth,
    projection,
  }
}
