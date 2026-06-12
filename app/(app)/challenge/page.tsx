import { dbQuery } from '@/lib/db'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import TeamChallengeCard from '@/components/TeamChallengeCard'
import WeeklyRankingCard from '@/components/WeeklyRankingCard'
import RecentActivationFeed from '@/components/RecentActivationFeed'
import ChallengeAdminPanel from '@/components/ChallengeAdminPanel'
import ActivationBadge from '@/components/ActivationBadge'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

// 業務月：25日以降は当月、24日以前は前月
function getBusinessMonth(d: Date): { year: number; month: number } {
  if (d.getDate() >= 25) return { year: d.getFullYear(), month: d.getMonth() + 1 }
  if (d.getMonth() === 0) return { year: d.getFullYear() - 1, month: 12 }
  return { year: d.getFullYear(), month: d.getMonth() }
}

// 業務期間ラベル: month=5 → "5/25〜6/24"
function periodLabel(m: number): string {
  return `${m}/25〜${m === 12 ? 1 : m + 1}/24`
}

export default async function ChallengePage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  const session = await getSession()
  if (!session.userId) redirect('/login')

  const params = await searchParams
  const now = new Date()
  const bm = getBusinessMonth(now)
  const year = params.year ? parseInt(params.year) : bm.year
  const month = params.month ? parseInt(params.month) : bm.month
  const isCurrentMonth = year === bm.year && month === bm.month

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  const isNextFuture = nextMonth.year > bm.year || (nextMonth.year === bm.year && nextMonth.month > bm.month)

  const day = now.getDate()

  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  const todayFmts = [
    `${year}-${mm}-${dd}`, `${year}/${mm}/${dd}`, `${year}/${month}/${day}`,
    `${month}/${day}`, `${mm}/${dd}`, `${month}月${day}日`, `${mm}月${dd}日`,
  ]
  const ph = todayFmts.map((_, i) => `$${i + 1}`).join(', ')

  type FollowItem = { name: string; staffName: string; typeLabel: string; fieldLabel: string }
  let followAlerts: FollowItem[] = []
  if (isCurrentMonth) try {
    const [sonetRows, directRows, postRows] = await Promise.all([
      dbQuery<{ name: string; staff_name: string }>(`SELECT ar.name, u.name AS staff_name FROM activation_records ar JOIN users u ON u.id = ar.user_id WHERE ar.type='sonet' AND ar.construction_date IN (${ph}) AND (ar.activation IS NULL OR ar.activation != '×')`, todayFmts),
      dbQuery<{ name: string; staff_name: string }>(`SELECT ar.name, u.name AS staff_name FROM activation_records ar JOIN users u ON u.id = ar.user_id WHERE ar.type='wimax_direct' AND ar.week_after IN (${ph}) AND (ar.activation IS NULL OR ar.activation != '×')`, todayFmts),
      dbQuery<{ name: string; staff_name: string }>(`SELECT ar.name, u.name AS staff_name FROM activation_records ar JOIN users u ON u.id = ar.user_id WHERE ar.type='wimax_post' AND ar.week_after_delivery IN (${ph}) AND (ar.activation IS NULL OR ar.activation != '×')`, todayFmts),
    ])
    followAlerts = [
      ...sonetRows.map((r: { name: string; staff_name: string }) => ({ name: r.name, staffName: r.staff_name, typeLabel: 'So-net', fieldLabel: '工事日当日' })),
      ...directRows.map((r: { name: string; staff_name: string }) => ({ name: r.name, staffName: r.staff_name, typeLabel: 'WiMAX直せち', fieldLabel: '獲得後1週間後' })),
      ...postRows.map((r: { name: string; staff_name: string }) => ({ name: r.name, staffName: r.staff_name, typeLabel: 'WiMAX後送り', fieldLabel: '受取日1週間後' })),
    ]
  } catch {}

  let total = 0
  let goal = 200
  let challengeTeams: any[] = []
  let memberRows: any[] = []
  let allUsers: any[] = []

  try {
    const [totalRow, goalRow, teamsRows, members, users] = await Promise.all([
      dbQuery(`SELECT COUNT(*)::int AS total FROM opening_calendar WHERE year = $1 AND month = $2 AND status = '○'`, [year, month]),
      dbQuery('SELECT goal FROM challenge_settings WHERE year = $1 AND month = $2', [year, month]),
      dbQuery('SELECT * FROM challenge_teams WHERE year = $1 AND month = $2 ORDER BY display_order, id', [year, month]),
      dbQuery(
        `SELECT u.id, u.name, COUNT(oc.id)::int AS activation
         FROM users u
         JOIN opening_calendar oc ON oc.user_id = u.id
         WHERE oc.year = $1 AND oc.month = $2 AND oc.status = '○'
         GROUP BY u.id, u.name
         ORDER BY activation DESC`,
        [year, month]
      ),
      dbQuery(`SELECT id, name FROM users WHERE is_active = true AND role != 'viewer' ORDER BY display_order, id`, []),
    ])
    total = totalRow[0]?.total ?? 0
    goal = goalRow[0]?.goal ?? 200
    memberRows = members
    allUsers = users
    challengeTeams = teamsRows.map(t => ({
      id: t.id,
      name: t.name,
      target: t.target,
      memberIds: JSON.parse(t.member_ids ?? '[]'),
      displayOrder: t.display_order,
    }))
  } catch {}

  const isManager = session.role === 'manager' || session.role === 'admin'

  // チームごとの集計
  const memberActivationMap: Record<number, number> = {}
  memberRows.forEach(m => { memberActivationMap[m.id] = m.activation })

  const teamsWithStats = challengeTeams.map(team => {
    const members = team.memberIds
      .map((id: number) => allUsers.find(u => u.id === id))
      .filter(Boolean)
      .map((u: any) => ({
        id: u.id,
        name: u.name,
        activation: memberActivationMap[u.id] ?? 0,
      }))
    const teamTotal = members.reduce((s: number, m: any) => s + m.activation, 0)
    return { ...team, members, teamTotal }
  })

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Challenge</p>
        <h1 className="text-2xl font-bold">チームチャレンジ</h1>
        <div className="flex items-center gap-3 mt-2">
          <Link href={`/challenge?year=${prevMonth.year}&month=${prevMonth.month}`} className="p-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <span className="text-sm font-bold min-w-[8rem] text-center">
            {year}年 {periodLabel(month)}
            {isCurrentMonth && <span className="ml-1.5 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">今期</span>}
          </span>
          {!isNextFuture ? (
            <Link href={`/challenge?year=${nextMonth.year}&month=${nextMonth.month}`} className="p-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
              <ChevronRight size={18} />
            </Link>
          ) : (
            <span className="p-1 rounded-lg bg-white/10 opacity-30 cursor-not-allowed">
              <ChevronRight size={18} />
            </span>
          )}
        </div>
      </div>

      <TeamChallengeCard total={total} year={year} month={month} goal={goal} />

      {/* ボスイベント */}
      {(() => {
        const phases = [
          { threshold: 0,                    name: 'スライム', icon: '🐛', color: 'from-green-400 to-emerald-500' },
          { threshold: Math.floor(goal / 4), name: 'オーク',   icon: '🐗', color: 'from-yellow-400 to-orange-500' },
          { threshold: Math.floor(goal / 2), name: 'ドラゴン', icon: '🐲', color: 'from-red-500 to-rose-600' },
          { threshold: Math.floor(goal * 3 / 4), name: 'ラスボス', icon: '👹', color: 'from-purple-600 to-violet-700' },
        ]
        const phaseSize = Math.ceil(goal / 4)
        if (total >= goal) return (
          <div className="mt-4 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-4 text-white text-center shadow">
            <div className="text-4xl mb-1">🎉</div>
            <p className="text-lg font-black">全ボス撃破！{goal}件達成！</p>
          </div>
        )
        const phaseIdx = phases.reduce((idx, p, i) => total >= p.threshold ? i : idx, 0)
        const phase = phases[phaseIdx]
        const dmg = Math.min(total - phase.threshold, phaseSize)
        const hpPct = Math.max(0, Math.round(((phaseSize - dmg) / phaseSize) * 100))
        const upcomingPhases = phases.slice(phaseIdx + 1)
        return (
          <>
            <div className={`mt-4 bg-gradient-to-br ${phase.color} rounded-2xl p-4 text-white shadow`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">ボスイベント フェーズ{phaseIdx + 1}/4</span>
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">⚔️ ミッションで詳細確認</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-5xl">{phase.icon}</span>
                <div className="flex-1">
                  <p className="text-lg font-black mb-1">{phase.name}</p>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span>HP</span><span>{phaseSize - dmg}/{phaseSize}</span>
                  </div>
                  <div className="h-3 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${hpPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
            {upcomingPhases.length > 0 && (
              <div className="mt-3 bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">⚔️ 次のボス</p>
                <div className="space-y-2">
                  {upcomingPhases.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl">
                      <span className="text-2xl">{p.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-700">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.threshold}件達成で出現</p>
                      </div>
                      <span className="text-xs font-bold text-gray-400">あと{p.threshold - total}件</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      })()}

      {/* チーム別達成状況 */}
      {teamsWithStats.length > 0 && (
        <div className="mt-6 space-y-4">
          {teamsWithStats.map((team) => {
            const pct = team.target > 0 ? Math.min(Math.round((team.teamTotal / team.target) * 100), 100) : 0
            const achieved = team.target > 0 && team.teamTotal >= team.target
            return (
              <div key={team.id} className={`bg-white rounded-2xl border p-4 ${achieved ? 'border-emerald-300' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{achieved ? '🏆' : '🎯'}</span>
                    <span className="text-sm font-bold text-gray-800">{team.name}</span>
                    {team.target > 0 && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${achieved ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        目標 {team.target}件
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-black ${achieved ? 'text-emerald-600' : 'text-indigo-600'}`}>
                      {team.teamTotal}件
                    </span>
                    {team.target > 0 && (
                      <p className={`text-sm font-black ${achieved ? 'text-emerald-500' : pct >= 50 ? 'text-indigo-500' : 'text-gray-400'}`}>
                        達成率 {Math.round((team.teamTotal / team.target) * 100)}%
                      </p>
                    )}
                  </div>
                </div>
                {team.target > 0 && (
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all ${achieved ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  {team.members.map((m: any) => {
                    const memberPct = team.teamTotal > 0 ? Math.round((m.activation / team.teamTotal) * 100) : 0
                    return (
                      <div key={m.id} className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-600">{m.name}</span>
                          <ActivationBadge cumulative={m.activation} size="xs" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-400 to-violet-400 rounded-full"
                              style={{ width: `${memberPct}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-indigo-600 w-8 text-right shrink-0">{m.activation}</span>
                          <span className="text-xs text-gray-400 w-8 text-right shrink-0">{memberPct}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 本日のフォロー対応アラート（日程ベース） */}
      {followAlerts.length > 0 && (
        <div className="mt-4 bg-amber-50 rounded-2xl border border-amber-200 p-4">
          <h2 className="text-sm font-bold text-amber-700 flex items-center gap-2 mb-3">
            🔔 本日のフォロー対応
          </h2>
          <div className="space-y-2">
            {followAlerts.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-amber-100">
                <span className="text-base">📋</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-gray-800">{item.staffName}</span>
                  <span className="text-sm text-gray-600">さんの</span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded mx-1">{item.typeLabel}獲得</span>
                  <span className="text-sm font-bold text-gray-800">{item.name}</span>
                  <span className="text-sm text-gray-600">さんの</span>
                  <span className="text-sm font-bold text-amber-700">「{item.fieldLabel}」</span>
                  <span className="text-sm text-gray-600">は本日です</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {isCurrentMonth && <RecentActivationFeed />}
      {isCurrentMonth && <WeeklyRankingCard />}

      {/* 個人別月次ランキング */}
      {memberRows.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            🏅 {year}年 {periodLabel(month)} 個人別開通数
          </h2>
          <div className="space-y-3">
            {memberRows.map((m, i) => {
              const pct = total > 0 ? Math.round((m.activation / total) * 100) : 0
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-base w-6 text-center shrink-0">
                    {i < 3 ? medals[i] : <span className="text-xs text-gray-400 font-bold">{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-800">{m.name}</span>
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

      {/* 管理者パネル（目標・チーム編集） */}
      {isManager && (
        <ChallengeAdminPanel
          year={year}
          month={month}
          currentGoal={goal}
          currentTeams={challengeTeams}
          allUsers={allUsers}
        />
      )}
    </div>
  )
}
