import { dbQuery } from '@/lib/db'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import TeamChallengeCard from '@/components/TeamChallengeCard'
import WeeklyRankingCard from '@/components/WeeklyRankingCard'
import RecentActivationFeed from '@/components/RecentActivationFeed'
import ChallengeAdminPanel from '@/components/ChallengeAdminPanel'

export const dynamic = 'force-dynamic'

export default async function ChallengePage() {
  const session = await getSession()
  if (!session.userId) redirect('/login')

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()

  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  const todayFmts = [
    `${year}-${mm}-${dd}`, `${year}/${mm}/${dd}`, `${year}/${month}/${day}`,
    `${month}/${day}`, `${mm}/${dd}`, `${month}月${day}日`, `${mm}月${dd}日`,
  ]
  const ph = todayFmts.map((_, i) => `$${i + 1}`).join(', ')

  let followAlerts: { name: string; staffName: string; typeLabel: string; fieldLabel: string }[] = []
  try {
    const [sonetRows, directRows, postRows] = await Promise.all([
      dbQuery<{ name: string; staff_name: string }>(`SELECT ar.name, u.name AS staff_name FROM activation_records ar JOIN users u ON u.id = ar.user_id WHERE ar.type='sonet' AND ar.construction_date IN (${ph})`, todayFmts),
      dbQuery<{ name: string; staff_name: string }>(`SELECT ar.name, u.name AS staff_name FROM activation_records ar JOIN users u ON u.id = ar.user_id WHERE ar.type='wimax_direct' AND ar.week_after IN (${ph})`, todayFmts),
      dbQuery<{ name: string; staff_name: string }>(`SELECT ar.name, u.name AS staff_name FROM activation_records ar JOIN users u ON u.id = ar.user_id WHERE ar.type='wimax_post' AND ar.week_after_delivery IN (${ph})`, todayFmts),
    ])
    followAlerts = [
      ...sonetRows.map(r => ({ name: r.name, staffName: r.staff_name, typeLabel: 'So-net', fieldLabel: '工事日当日' })),
      ...directRows.map(r => ({ name: r.name, staffName: r.staff_name, typeLabel: 'WiMAX直せち', fieldLabel: '獲得後1週間後' })),
      ...postRows.map(r => ({ name: r.name, staffName: r.staff_name, typeLabel: 'WiMAX後送り', fieldLabel: '受取日1週間後' })),
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
        <p className="text-sm text-violet-200 mt-0.5">{year}年{month}月</p>
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
                <div className="space-y-1.5">
                  {team.members.map((m: any) => {
                    const memberPct = team.teamTotal > 0 ? Math.round((m.activation / team.teamTotal) * 100) : 0
                    return (
                      <div key={m.id} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-20 shrink-0 truncate">{m.name}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-400 to-violet-400 rounded-full"
                            style={{ width: `${memberPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-indigo-600 w-8 text-right shrink-0">{m.activation}</span>
                        <span className="text-xs text-gray-400 w-8 text-right shrink-0">{memberPct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 本日のフォロー対応アラート */}
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

      <RecentActivationFeed />
      <WeeklyRankingCard />

      {/* 個人別月次ランキング */}
      {memberRows.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            🏅 今月の個人別開通数
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
                      <span className="text-sm font-medium text-gray-800 truncate">{m.name}</span>
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
