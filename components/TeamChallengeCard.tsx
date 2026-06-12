'use client'

interface Props {
  total: number
  year: number
  month: number
  goal?: number
}

export default function TeamChallengeCard({ total, year, month, goal = 200 }: Props) {
  const CHALLENGE_GOAL = goal
  const quarter = Math.floor(CHALLENGE_GOAL / 4)
  const MILESTONES = [
    { count: quarter,     emoji: '🌱', label: String(quarter) },
    { count: quarter * 2, emoji: '🔥', label: String(quarter * 2) },
    { count: quarter * 3, emoji: '⚡', label: String(quarter * 3) },
    { count: CHALLENGE_GOAL, emoji: '🏆', label: String(CHALLENGE_GOAL) },
  ]

  const progress = Math.min((total / CHALLENGE_GOAL) * 100, 100)
  const achieved = total >= CHALLENGE_GOAL

  const now = new Date()
  // 業務月：25日以降は当月、24日以前は前月
  const bmMonth = now.getDate() >= 25 ? now.getMonth() + 1 : (now.getMonth() === 0 ? 12 : now.getMonth())
  const bmYear  = now.getDate() >= 25 ? now.getFullYear() : (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear())
  const isCurrentMonth = year === bmYear && month === bmMonth

  // 業務期間: M/25 〜 (M+1)/24
  const periodStart = new Date(year, month - 1, 25)
  const periodEnd   = new Date(year, month, 24)
  const totalDays   = Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000) + 1
  const daysElapsed = isCurrentMonth
    ? Math.min(Math.max(Math.round((now.getTime() - periodStart.getTime()) / 86400000) + 1, 1), totalDays)
    : null
  const paceTarget  = daysElapsed !== null ? Math.round(CHALLENGE_GOAL * (daysElapsed / totalDays)) : null
  const paceStatus  = paceTarget !== null ? total - paceTarget : null

  const nm = month === 12 ? 1 : month + 1

  return (
    <div className={`rounded-2xl p-5 shadow-sm border ${achieved ? 'bg-gradient-to-br from-yellow-400 to-amber-500 border-yellow-300' : 'bg-gradient-to-br from-indigo-600 to-violet-600 border-indigo-500'} text-white`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{achieved ? '🏆' : '🎯'}</span>
          <span className="text-sm font-bold tracking-wide">チーム{CHALLENGE_GOAL}開通チャレンジ</span>
        </div>
        <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
          {year}年 {month}/25〜{nm}/24
        </span>
      </div>

      <div className="flex items-end gap-2 mb-4 mt-3">
        <span className="text-5xl font-black leading-none">{total}</span>
        <span className="text-lg font-bold opacity-70 mb-1">/ {CHALLENGE_GOAL} 開通</span>
        <span className="mb-1 ml-auto text-2xl font-black bg-white/20 px-3 py-1 rounded-xl">
          {Math.round(progress)}%
        </span>
        {achieved && (
          <span className="text-sm font-bold bg-white text-yellow-600 px-3 py-1 rounded-full shadow">🎉 達成！</span>
        )}
      </div>

      {/* プログレスバー */}
      <div className="relative mb-3">
        <div className="h-4 bg-white/20 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${achieved ? 'bg-white' : 'bg-gradient-to-r from-emerald-300 to-cyan-300'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {MILESTONES.slice(0, -1).map((m) => (
          <div
            key={m.count}
            className="absolute top-0 h-4 w-0.5 bg-white/40"
            style={{ left: `${(m.count / CHALLENGE_GOAL) * 100}%` }}
          />
        ))}
      </div>

      {/* マイルストーン */}
      <div className="flex justify-between mb-3">
        {MILESTONES.map((m) => {
          const reached = total >= m.count
          return (
            <div key={m.count} className="flex flex-col items-center gap-1">
              <span className={`text-lg ${reached ? '' : 'grayscale opacity-40'}`}>{m.emoji}</span>
              <span className={`text-xs font-bold ${reached ? 'text-white' : 'text-white/40'}`}>{m.label}</span>
            </div>
          )
        })}
      </div>

      {/* ペース表示（当月のみ） */}
      {paceStatus !== null && !achieved && (
        <div className={`text-xs font-semibold px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 ${paceStatus >= 0 ? 'bg-emerald-400/30' : 'bg-red-400/30'}`}>
          <span>{paceStatus >= 0 ? '📈' : '📉'}</span>
          <span>
            ペース目標 {paceTarget}件 に対して{' '}
            <span className="font-black">{paceStatus >= 0 ? `+${paceStatus}` : paceStatus} 件</span>
            {paceStatus >= 0 ? '　先行中' : '　ビハインド'}
          </span>
        </div>
      )}
      {!achieved && (
        <p className="text-xs text-white/60 mt-2">あと <span className="text-white font-bold">{CHALLENGE_GOAL - total} 件</span> で達成</p>
      )}
    </div>
  )
}
