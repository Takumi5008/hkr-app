import { dbQuery } from '@/lib/db'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import TeamChallengeCard from '@/components/TeamChallengeCard'
import ActivationBadge from '@/components/ActivationBadge'
import WeeklyRankingCard from '@/components/WeeklyRankingCard'
import RecentActivationFeed from '@/components/RecentActivationFeed'

export const dynamic = 'force-dynamic'

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


  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Challenge</p>
        <h1 className="text-2xl font-bold">チームチャレンジ</h1>
        <p className="text-sm text-violet-200 mt-0.5">{year}年{month}月</p>
      </div>

      <TeamChallengeCard total={total} year={year} month={month} />

      {/* ボスイベント */}
      {(() => {
        const GOAL = 200
        const phases = [
          { threshold: 0,   name: 'スライム', icon: '🐛', color: 'from-green-400 to-emerald-500' },
          { threshold: 50,  name: 'オーク',   icon: '🐗', color: 'from-yellow-400 to-orange-500' },
          { threshold: 100, name: 'ドラゴン', icon: '🐲', color: 'from-red-500 to-rose-600' },
          { threshold: 150, name: 'ラスボス', icon: '👹', color: 'from-purple-600 to-violet-700' },
        ]
        if (total >= GOAL) return (
          <div className="mt-4 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-4 text-white text-center shadow">
            <div className="text-4xl mb-1">🎉</div>
            <p className="text-lg font-black">全ボス撃破！200件達成！</p>
          </div>
        )
        const phaseIdx = phases.reduce((idx, p, i) => total >= p.threshold ? i : idx, 0)
        const phase = phases[phaseIdx]
        const dmg = Math.min(total - phase.threshold, 50)
        const hpPct = Math.max(0, Math.round(((50 - dmg) / 50) * 100))
        return (
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
                  <span>HP</span><span>{50 - dmg}/50</span>
                </div>
                <div className="h-3 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all" style={{ width: `${hpPct}%` }} />
                </div>
              </div>
            </div>
          </div>
        )
      })()}

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
