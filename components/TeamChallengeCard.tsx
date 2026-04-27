'use client'

const CHALLENGE_GOAL = 200
const MILESTONES = [
  { count: 50,  emoji: '🌱', label: '50' },
  { count: 100, emoji: '🔥', label: '100' },
  { count: 150, emoji: '⚡', label: '150' },
  { count: 200, emoji: '🏆', label: '200' },
]

interface Props {
  total: number
  year: number
  month: number
}

export default function TeamChallengeCard({ total, year, month }: Props) {
  const progress = Math.min((total / CHALLENGE_GOAL) * 100, 100)
  const achieved = total >= CHALLENGE_GOAL

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = now.getDate()
  const paceTarget = isCurrentMonth ? Math.round(CHALLENGE_GOAL * (today / daysInMonth)) : null
  const paceStatus = paceTarget !== null ? total - paceTarget : null

  return (
    <div className={`rounded-2xl p-5 shadow-sm border ${achieved ? 'bg-gradient-to-br from-yellow-400 to-amber-500 border-yellow-300' : 'bg-gradient-to-br from-indigo-600 to-violet-600 border-indigo-500'} text-white`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{achieved ? '🏆' : '🎯'}</span>
          <span className="text-sm font-bold tracking-wide">チーム200開通チャレンジ</span>
        </div>
        <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
          {year}年{month}月
        </span>
      </div>

      <div className="flex items-end gap-2 mb-4 mt-3">
        <span className="text-5xl font-black leading-none">{total}</span>
        <span className="text-lg font-bold opacity-70 mb-1">/ {CHALLENGE_GOAL} 開通</span>
        {achieved && (
          <span className="mb-1 ml-auto text-sm font-bold bg-white text-yellow-600 px-3 py-1 rounded-full shadow">🎉 達成！</span>
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
