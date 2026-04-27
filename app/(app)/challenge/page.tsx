import { dbQuery } from '@/lib/db'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import TeamChallengeCard from '@/components/TeamChallengeCard'
import ActivationBadge from '@/components/ActivationBadge'
import WeeklyRankingCard from '@/components/WeeklyRankingCard'
import RecentActivationFeed from '@/components/RecentActivationFeed'
import PlayerCardsSection from '@/components/PlayerCardsSection'
import { type PlayerCardData, type CardTier, type FormResult } from '@/components/PlayerCard'
import { calcHKR } from '@/lib/hkr'

export const dynamic = 'force-dynamic'

function getWeekBounds(weeksAgo: number): { from: string; to: string } {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday - weeksAgo * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(monday), to: fmt(sunday) }
}

function statScore(value: number, max: number): number {
  return Math.min(Math.round((value / max) * 99), 99)
}

export default async function ChallengePage() {
  const session = await getSession()
  if (!session.userId) redirect('/login')

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [row] = await dbQuery(
    `SELECT COALESCE(SUM(activation_count), 0)::int AS total FROM records WHERE year = $1 AND month = $2`,
    [year, month]
  )
  const total: number = row?.total ?? 0

  // 個人別月次ランキング（今月）
  const memberRows = await dbQuery(
    `SELECT u.id, u.name,
            COALESCE(SUM(r.activation_count), 0)::int AS activation,
            COALESCE(SUM(r.cancel_count), 0)::int AS cancel
     FROM users u
     LEFT JOIN records r ON r.user_id = u.id AND r.year = $1 AND r.month = $2
     GROUP BY u.id, u.name
     HAVING COALESCE(SUM(r.activation_count), 0) > 0
     ORDER BY activation DESC`,
    [year, month]
  )

  // 今月の行動量（pingpong+face）
  const monthStr = `${year}-${String(month).padStart(2, '0')}-%`
  const activityRows = await dbQuery(
    `SELECT user_id,
            COALESCE(SUM(pingpong_count + intercom_count), 0)::int AS action_total,
            COUNT(DISTINCT date)::int AS active_days
     FROM daily_activity
     WHERE date LIKE $1
     GROUP BY user_id`,
    [monthStr]
  )
  const activityMap = new Map(activityRows.map((r: any) => [r.user_id, r]))

  // 先週 TOTW
  const lastWeek = getWeekBounds(1)
  const totwRows = await dbQuery(
    `SELECT user_id, COALESCE(SUM(wimax + sonet), 0)::int AS weekly
     FROM daily_activity
     WHERE date >= $1 AND date <= $2
     GROUP BY user_id
     ORDER BY weekly DESC LIMIT 1`,
    [lastWeek.from, lastWeek.to]
  )
  const totwUserId: number | null = (totwRows[0]?.weekly ?? 0) > 0 ? totwRows[0].user_id : null

  // 直近4週フォーム per user
  const formWeeks = [0, 1, 2, 3].map((w) => getWeekBounds(w))
  const earliestDate = formWeeks[formWeeks.length - 1].from
  const formActivityRows = await dbQuery(
    `SELECT user_id, date, (wimax + sonet)::int AS activation
     FROM daily_activity WHERE date >= $1 ORDER BY date`,
    [earliestDate]
  )
  const formMap = new Map<number, FormResult[]>()
  for (const m of memberRows as any[]) {
    const userDays = formActivityRows.filter((r: any) => r.user_id === m.id)
    const weekResults: FormResult[] = formWeeks.map(({ from, to }) => {
      const sum = userDays
        .filter((r: any) => r.date >= from && r.date <= to)
        .reduce((s: number, r: any) => s + r.activation, 0)
      return sum >= 4 ? 'W' : sum >= 1 ? 'D' : 'L'
    })
    formMap.set(m.id, weekResults)
  }

  // プレイヤーカード構築
  const totalMembers = memberRows.length
  const cards: PlayerCardData[] = (memberRows as any[]).map((m, idx) => {
    const hkr = calcHKR(m.activation, m.cancel) ?? 50
    const act = activityMap.get(m.id)
    const actionScore = statScore(act?.action_total ?? 0, 150)
    const consistScore = statScore(act?.active_days ?? 0, 20)
    const activationScore = statScore(m.activation, 20)
    const hkrScore = Math.min(hkr, 99)
    const form = formMap.get(m.id) ?? ['L', 'L', 'L', 'L']
    const formScore = Math.round((form.filter((f) => f === 'W').length * 2 + form.filter((f) => f === 'D').length) / (form.length * 2) * 99)

    const ovr = Math.round(
      activationScore * 0.40 +
      hkrScore * 0.30 +
      actionScore * 0.15 +
      consistScore * 0.10 +
      formScore * 0.05
    )

    const isTotw = m.id === totwUserId
    let tier: CardTier = ovr >= 85 ? 'elite' : ovr >= 72 ? 'gold' : ovr >= 55 ? 'silver' : 'bronze'
    if (isTotw) tier = 'totw'

    const rank = idx + 1
    const position = rank <= Math.ceil(totalMembers * 0.25) ? 'FW'
      : rank <= Math.ceil(totalMembers * 0.65) ? 'MF' : 'DF'

    return {
      userId: m.id,
      name: m.name,
      position,
      ovr,
      tier,
      isTotw,
      stats: [
        { label: '開通', value: activationScore },
        { label: 'HKR', value: hkrScore },
        { label: '行動', value: actionScore },
        { label: '継続', value: consistScore },
      ],
      form: form as FormResult[],
    }
  })

  // TOTW を先頭に
  cards.sort((a, b) => (b.isTotw ? 1 : 0) - (a.isTotw ? 1 : 0) || b.ovr - a.ovr)

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Challenge</p>
        <h1 className="text-2xl font-bold">チームチャレンジ</h1>
        <p className="text-sm text-violet-200 mt-0.5">{year}年{month}月</p>
      </div>

      <TeamChallengeCard total={total} year={year} month={month} />

      {/* プレイヤーカード */}
      <PlayerCardsSection cards={cards} />

      {/* 本日の開通速報 */}
      <RecentActivationFeed />

      {/* 今週の開通ランキング */}
      <WeeklyRankingCard />

      {/* 個人別月次ランキング */}
      {memberRows.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            🏅 今月の個人別開通数
          </h2>
          <div className="space-y-3">
            {(memberRows as any[]).map((m, i) => {
              const pct = total > 0 ? Math.round((m.activation / total) * 100) : 0
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-base w-6 text-center shrink-0">
                    {i < 3 ? medals[i] : <span className="text-xs text-gray-400 font-bold">{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className="text-sm font-medium text-gray-800 truncate">{m.name}</span>
                        <ActivationBadge cumulative={m.activation} size="xs" />
                      </div>
                      <span className="text-sm font-bold text-indigo-600 shrink-0 ml-2">{m.activation}件</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-400 to-violet-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right shrink-0">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* バッジ一覧 */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3">🎖️ 称号バッジ一覧</h2>
        <div className="grid grid-cols-1 gap-2">
          {[
            { min: 20, emoji: '🏆', label: '開通レジェンド', desc: '今月20件以上' },
            { min: 15, emoji: '👑', label: '開通マスター',   desc: '今月15件以上' },
            { min: 10, emoji: '💎', label: '開通職人',       desc: '今月10件以上' },
            { min: 7,  emoji: '🔥', label: '開通師',         desc: '今月7件以上' },
            { min: 4,  emoji: '⚡', label: '開通士',         desc: '今月4件以上' },
            { min: 1,  emoji: '🌱', label: '見習い',         desc: '今月1件以上' },
          ].map((b) => (
            <div key={b.min} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl">
              <span className="text-xl w-7 text-center">{b.emoji}</span>
              <div className="flex-1">
                <span className="text-sm font-bold text-gray-800">{b.label}</span>
                <span className="text-xs text-gray-400 ml-2">{b.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
