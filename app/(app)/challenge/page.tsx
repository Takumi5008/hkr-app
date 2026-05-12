'use client'

import { useState, useEffect } from 'react'
import TeamChallengeCard from '@/components/TeamChallengeCard'
import WeeklyRankingCard from '@/components/WeeklyRankingCard'
import RecentActivationFeed from '@/components/RecentActivationFeed'
import ActivationBadge from '@/components/ActivationBadge'

const BOSS_PHASES = [
  { threshold: 0,   name: 'スライム', icon: '🐛', color: 'from-green-400 to-emerald-500' },
  { threshold: 50,  name: 'オーク',   icon: '🐗', color: 'from-yellow-400 to-orange-500' },
  { threshold: 100, name: 'ドラゴン', icon: '🐲', color: 'from-red-500 to-rose-600' },
  { threshold: 150, name: 'ラスボス', icon: '👹', color: 'from-purple-600 to-violet-700' },
]

const BADGE_DEFS = [
  { min: 20, emoji: '🏆', label: '開通レジェンド', desc: '今月20件以上' },
  { min: 15, emoji: '👑', label: '開通マスター',   desc: '今月15件以上' },
  { min: 10, emoji: '💎', label: '開通職人',       desc: '今月10件以上' },
  { min: 7,  emoji: '🔥', label: '開通師',         desc: '今月7件以上' },
  { min: 4,  emoji: '⚡', label: '開通士',         desc: '今月4件以上' },
  { min: 1,  emoji: '🌱', label: '見習い',         desc: '今月1件以上' },
]

interface MemberRow { id: number; name: string; activation: number }

export default function ChallengePage() {
  const [tab, setTab] = useState<'team' | 'personal'>('team')
  const [total, setTotal] = useState(0)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [myActivation, setMyActivation] = useState(0)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  useEffect(() => {
    const y = year, m = month
    Promise.all([
      fetch(`/api/challenge/total?year=${y}&month=${m}`).then(r => r.json()),
      fetch(`/api/challenge/members?year=${y}&month=${m}`).then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
    ]).then(([tot, mem, me]) => {
      if (typeof tot.total === 'number') setTotal(tot.total)
      if (Array.isArray(mem)) {
        setMembers(mem)
        const myRow = mem.find((r: MemberRow) => r.id === me.id)
        if (myRow) setMyActivation(myRow.activation)
      }
    })

  }, [])

  const GOAL = 200
  const phaseIdx = BOSS_PHASES.reduce((idx, p, i) => total >= p.threshold ? i : idx, 0)
  const phase = BOSS_PHASES[phaseIdx]
  const dmg = Math.min(total - phase.threshold, 50)
  const hpPct = Math.max(0, Math.round(((50 - dmg) / 50) * 100))

  const myBadge = BADGE_DEFS.find(b => myActivation >= b.min)

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Challenge</p>
        <h1 className="text-2xl font-bold">チャレンジ</h1>
        <p className="text-sm text-violet-200 mt-0.5">{year}年{month}月</p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
        {([['team', '👥 チーム'], ['personal', '👤 個人']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* チームタブ */}
      {tab === 'team' && (
        <div className="space-y-4">
          <TeamChallengeCard total={total} year={year} month={month} />

          {/* ボス */}
          {total >= GOAL ? (
            <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-4 text-white text-center shadow">
              <div className="text-4xl mb-1">🎉</div>
              <p className="text-lg font-black">全ボス撃破！200件達成！</p>
            </div>
          ) : (
            <div className={`bg-gradient-to-br ${phase.color} rounded-2xl p-4 text-white shadow`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">ボスイベント フェーズ{phaseIdx + 1}/4</span>
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
          )}

          <RecentActivationFeed />
          <WeeklyRankingCard />
        </div>
      )}

      {/* 個人タブ */}
      {tab === 'personal' && (
        <div className="space-y-4">
          {/* 自分のステータス */}
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-5">
            <p className="text-xs text-gray-400 mb-1">今月の自分の開通数</p>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black text-indigo-600">{myActivation}<span className="text-lg font-bold ml-1">件</span></span>
              {myBadge && (
                <span className="text-sm font-bold mb-1">{myBadge.emoji} {myBadge.label}</span>
              )}
            </div>
          </div>

          {/* 個人別ランキング */}
          {members.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4">🏅 今月の個人別開通数</h2>
              <div className="space-y-3">
                {members.map((m, i) => {
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
                          <div className="h-full bg-gradient-to-r from-indigo-400 to-violet-400 rounded-full"
                            style={{ width: `${pct}%` }} />
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
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-3">🎖️ 称号バッジ一覧</h2>
            <div className="grid grid-cols-1 gap-2">
              {BADGE_DEFS.map(b => (
                <div key={b.min} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${myActivation >= b.min ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50'}`}>
                  <span className="text-xl w-7 text-center">{b.emoji}</span>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-gray-800">{b.label}</span>
                    <span className="text-xs text-gray-400 ml-2">{b.desc}</span>
                  </div>
                  {myActivation >= b.min && <span className="text-xs text-indigo-500 font-bold">達成</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
