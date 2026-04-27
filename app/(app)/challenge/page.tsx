import { dbQuery } from '@/lib/db'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import TeamChallengeCard from '@/components/TeamChallengeCard'

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

  // 個人別ランキング
  const memberRows = await dbQuery(
    `SELECT u.name, COALESCE(SUM(r.activation_count), 0)::int AS activation
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

      {/* 個人別貢献ランキング */}
      {memberRows.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            🏅 今月の個人別開通数
          </h2>
          <div className="space-y-2">
            {memberRows.map((m: any, i: number) => {
              const pct = Math.round((m.activation / total) * 100)
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={m.name} className="flex items-center gap-3">
                  <span className="text-base w-6 text-center shrink-0">
                    {i < 3 ? medals[i] : <span className="text-xs text-gray-400 font-bold">{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
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
    </div>
  )
}
