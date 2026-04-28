'use client'

import AccountCard from './AccountCard'
import { HKR_TARGET } from '@/lib/hkr'

interface MemberStat {
  user: { id: number; name: string; avatar: string | null; points: number }
  summaries: { product: string; cancel: number; activation: number; hkr: number | null }[]
  allHkr: number | null
  totalActivation: number
  totalCancel: number
}

interface MtgStat { present_count: number; absent_count: number; late_count: number }
interface ActivityStat { entry_days: number; work_hours: number; pin_count: number; pingpong_count: number; intercom_count: number; hearing_sheet: number; consent_form: number }
interface LoginStat { login_count: number; last_login_at: string | null }

interface RawMemberStats {
  mtg: (MtgStat & { user_id: number })[]
  activity: (ActivityStat & { user_id: number })[]
  login: (LoginStat & { user_id: number })[]
  opening: ({ opening_count: number; user_id: number })[]
}

interface Props {
  stats: MemberStat[]
  products: string[]
  memberStats: RawMemberStats | null
}

interface TeamAvgs {
  hkr: number | null
  activation: number
  points: number
  workHours: number
  entryDays: number
  pinCount: number
  pingpongCount: number
  openingPerHour: number  // 開通数/稼働時間
  cancelPerHour: number   // 解除数/稼働時間
}

function computeTeamAvgs(stats: MemberStat[], rawStats: RawMemberStats | null): TeamAvgs {
  const n = stats.length || 1
  const validHkrs = stats.filter((d) => d.allHkr != null).map((d) => d.allHkr!)
  const hkr = validHkrs.length > 0
    ? Math.round(validHkrs.reduce((a, b) => a + b, 0) / validHkrs.length * 10) / 10
    : null
  const activation = stats.reduce((s, d) => s + d.totalActivation, 0) / n
  const points = stats.reduce((s, d) => s + (d.user.points ?? 0), 0) / n

  if (!rawStats) {
    return { hkr, activation, points, workHours: 0, entryDays: 0, pinCount: 0, pingpongCount: 0, openingPerHour: 0, cancelPerHour: 0 }
  }

  const an = rawStats.activity.length || 1
  const workHours = rawStats.activity.reduce((s, a) => s + (a.work_hours ?? 0), 0) / an
  const entryDays = rawStats.activity.reduce((s, a) => s + (a.entry_days ?? 0), 0) / an
  const pinCount = rawStats.activity.reduce((s, a) => s + (a.pin_count ?? 0), 0) / an
  const pingpongCount = rawStats.activity.reduce((s, a) => s + (a.pingpong_count ?? 0), 0) / an

  const membersWithHours = stats.filter((m) => {
    const act = rawStats.activity.find((a) => a.user_id === m.user.id)
    return act && act.work_hours > 0
  })
  const mhN = membersWithHours.length || 1

  const openingPerHour = membersWithHours.reduce((s, m) => {
    const act = rawStats.activity.find((a) => a.user_id === m.user.id)!
    return s + m.totalActivation / act.work_hours
  }, 0) / mhN

  const cancelPerHour = membersWithHours.reduce((s, m) => {
    const act = rawStats.activity.find((a) => a.user_id === m.user.id)!
    return s + m.totalCancel / act.work_hours
  }, 0) / mhN

  return { hkr, activation, points, workHours, entryDays, pinCount, pingpongCount, openingPerHour, cancelPerHour }
}

function round1(n: number) { return Math.round(n * 10) / 10 }

function buildStrengths(
  member: MemberStat,
  mtg: MtgStat,
  activity: ActivityStat,
  login: LoginStat,
  avgs: TeamAvgs
): string[] {
  const { allHkr, totalActivation, totalCancel, summaries, user } = member
  const result: string[] = []

  // HKR
  if (allHkr != null) {
    if (allHkr >= 90) result.push(`高HKRを維持（${allHkr}%）`)
    else if (allHkr >= HKR_TARGET) result.push(`目標HKRを達成（${allHkr}%）`)
    if (avgs.hkr != null && allHkr > avgs.hkr + 3) result.push(`チーム平均HKR（${avgs.hkr}%）を上回る`)
  }

  // 行動表：時間あたりの生産性
  if (activity.work_hours > 0) {
    const opPerH = totalActivation / activity.work_hours
    const canPerH = totalCancel / activity.work_hours
    if (avgs.openingPerHour > 0 && opPerH >= avgs.openingPerHour * 1.2)
      result.push(`開通効率が高い（${round1(opPerH)}件/h）`)
    if (avgs.cancelPerHour > 0 && canPerH >= avgs.cancelPerHour * 1.2)
      result.push(`解除効率が高い（${round1(canPerH)}件/h）`)
  }

  // 開通数
  if (totalActivation > 0 && avgs.activation > 0 && totalActivation >= avgs.activation * 1.2)
    result.push(`開通数がチーム平均以上（${totalActivation}件）`)

  // MTG
  const mtgTotal = mtg.present_count + mtg.absent_count + mtg.late_count
  if (mtgTotal > 0 && mtg.absent_count === 0 && mtg.late_count === 0)
    result.push('MTG完全皆勤')
  else if (mtgTotal >= 3 && mtg.absent_count === 0)
    result.push(`MTG無欠席（${mtg.present_count + mtg.late_count}/${mtgTotal}回）`)

  // ピンポン・インターホン
  if (activity.pin_count > 0 && avgs.pinCount > 0 && activity.pin_count >= avgs.pinCount * 1.2)
    result.push(`ピンポン訪問が多い（${activity.pin_count}回）`)
  if (activity.pingpong_count > 0 && avgs.pingpongCount > 0 && activity.pingpong_count >= avgs.pingpongCount * 1.2)
    result.push(`インターホン接触が多い（${activity.pingpong_count}回）`)
  if (activity.hearing_sheet > 0)
    result.push(`ヒアリングシート記入（${activity.hearing_sheet}件）`)

  // ログイン（最終ログインからの経過日数）
  if (login.last_login_at) {
    const days = Math.floor((Date.now() - new Date(login.last_login_at).getTime()) / 86400000)
    if (days <= 3) result.push('最近アプリを積極的に活用')
  }

  // ポイント
  if ((user.points ?? 0) > 0 && avgs.points > 0 && (user.points ?? 0) >= avgs.points * 1.3)
    result.push(`ポイントランキング上位（${user.points}pt）`)

  // 商材数
  const activeProducts = summaries.filter((s) => s.activation > 0)
  if (activeProducts.length >= 2) result.push(`${activeProducts.length}商材で実績あり`)

  return result.slice(0, 3)
}

function buildImprovements(
  member: MemberStat,
  mtg: MtgStat,
  activity: ActivityStat,
  login: LoginStat,
  avgs: TeamAvgs,
  products: string[]
): string[] {
  const { allHkr, totalActivation, totalCancel, summaries } = member
  const result: string[] = []

  // HKR
  if (allHkr == null) {
    result.push('HKRデータの入力が必要')
    return result
  }
  if (allHkr < HKR_TARGET) {
    result.push(`HKR改善が必要（目標${HKR_TARGET}%、現在${allHkr}%）`)
    result.push(`あと${round1(HKR_TARGET - allHkr)}%で目標達成`)
  } else if (avgs.hkr != null && allHkr < avgs.hkr - 3) {
    result.push(`チーム平均HKR（${avgs.hkr}%）に届いていない`)
  }

  // MTG
  if (mtg.absent_count > 0) result.push(`MTG欠席あり（${mtg.absent_count}回）`)
  else if (mtg.late_count > 1) result.push(`MTG遅刻が多い（${mtg.late_count}回）`)

  // 開通数
  if (totalActivation === 0) result.push('今月の開通実績なし')
  else if (avgs.activation > 0 && totalActivation < avgs.activation * 0.8)
    result.push(`開通数を増やす余地あり（チーム平均${Math.round(avgs.activation)}件）`)

  // 行動表：時間あたり生産性
  if (activity.work_hours > 0) {
    const opPerH = totalActivation / activity.work_hours
    const canPerH = totalCancel / activity.work_hours
    if (avgs.openingPerHour > 0 && opPerH < avgs.openingPerHour * 0.7)
      result.push(`開通効率が低い（${round1(opPerH)}件/h、平均${round1(avgs.openingPerHour)}）`)
    if (avgs.cancelPerHour > 0 && canPerH < avgs.cancelPerHour * 0.7)
      result.push(`解除効率が低い（${round1(canPerH)}件/h、平均${round1(avgs.cancelPerHour)}）`)
  } else if (activity.entry_days === 0) {
    result.push('行動表の記入がない')
  } else if (avgs.workHours > 0 && activity.work_hours < avgs.workHours * 0.6) {
    result.push('稼働時間が少ない')
  }

  // ログイン（最終ログインからの経過日数）
  if (login.last_login_at) {
    const days = Math.floor((Date.now() - new Date(login.last_login_at).getTime()) / 86400000)
    if (days > 14) result.push(`最近のアプリ利用が少ない（${days}日前）`)
  }

  // 商材
  const activeProducts = summaries.filter((s) => s.activation > 0)
  if (activeProducts.length <= 1 && products.length > 1) result.push('他商材への展開を検討')

  return result.slice(0, 3)
}

export default function AccountCardsSection({ stats, products, memberStats }: Props) {
  if (stats.length === 0) return null

  const avgs = computeTeamAvgs(stats, memberStats)

  const emptyMtg: MtgStat = { present_count: 0, absent_count: 0, late_count: 0 }
  const emptyActivity: ActivityStat = { entry_days: 0, work_hours: 0, pin_count: 0, pingpong_count: 0, intercom_count: 0, hearing_sheet: 0, consent_form: 0 }
  const emptyLogin: LoginStat = { login_count: 0, last_login_at: null }

  return (
    <div className="mt-4">
      <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        👤 アカウントカード
        <span className="text-xs font-normal text-gray-400">各メンバーの特徴と改善点</span>
      </h2>
      <div
        className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {stats.map((member) => {
          const mtg = memberStats?.mtg.find((m) => m.user_id === member.user.id) ?? emptyMtg
          const activity = memberStats?.activity.find((a) => a.user_id === member.user.id) ?? emptyActivity
          const login = memberStats?.login.find((l) => l.user_id === member.user.id) ?? emptyLogin
          return (
            <div key={member.user.id} style={{ scrollSnapAlign: 'start' }}>
              <AccountCard
                user={member.user}
                hkr={member.allHkr}
                totalActivation={member.totalActivation}
                totalCancel={member.totalCancel}
                loginCount={login.login_count}
                entryDays={activity.entry_days}
                mtgAbsent={mtg.absent_count}
                strengths={buildStrengths(member, mtg, activity, login, avgs)}
                improvements={buildImprovements(member, mtg, activity, login, avgs, products)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
