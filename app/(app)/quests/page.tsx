'use client'

import { useState, useEffect } from 'react'

const CHALLENGE_GOAL = 200

interface Quest {
  id: string; title: string; desc: string; icon: string
  target: number; reward: number; bgColor: string; barColor: string
  current: number; completed: boolean; claimed: boolean
}

interface Badge {
  id: string; name: string; icon: string; desc: string; color: string
  earned: boolean; earnedAt: string | null
}

const BOSS_PHASES = [
  { threshold: 0,   name: 'スライム',     icon: '🐛', hp: 50,  color: 'from-green-400 to-emerald-500' },
  { threshold: 50,  name: 'オーク',       icon: '🐗', hp: 50,  color: 'from-yellow-400 to-orange-500' },
  { threshold: 100, name: 'ドラゴン',     icon: '🐲', hp: 50,  color: 'from-red-500 to-rose-600' },
  { threshold: 150, name: 'ラスボス',     icon: '👹', hp: 50,  color: 'from-purple-600 to-violet-700' },
]

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [weekStart, setWeekStart] = useState('')
  const [teamTotal, setTeamTotal] = useState(0)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [claimMsg, setClaimMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null)
  const [tab, setTab] = useState<'quests' | 'boss' | 'badges'>('quests')
  const [myPoints, setMyPoints] = useState(0)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [q, b, me, ch] = await Promise.all([
      fetch('/api/quests').then(r => r.json()),
      fetch('/api/badges').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.json()),
      fetch(`/api/challenge/cards?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    if (q.quests) { setQuests(q.quests); setWeekStart(q.weekStart) }
    if (Array.isArray(b)) setBadges(b)
    if (typeof me.points === 'number') setMyPoints(me.points)
    if (Array.isArray(ch)) setTeamTotal(ch.reduce((s: number, c: any) => s + (c.activation ?? 0), 0))
  }

  async function handleClaim(questId: string) {
    setClaiming(questId)
    const res = await fetch('/api/quests/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questId }),
    })
    const data = await res.json()
    if (res.ok) {
      setMyPoints(data.newPoints)
      setClaimMsg({ id: questId, msg: `+${data.reward}pt 獲得！`, ok: true })
      setQuests(prev => prev.map(q => q.id === questId ? { ...q, claimed: true } : q))
    } else {
      setClaimMsg({ id: questId, msg: data.error, ok: false })
    }
    setClaiming(null)
    setTimeout(() => setClaimMsg(null), 3000)
  }

  const now = new Date()
  const weekEnd = weekStart ? new Date(new Date(weekStart).getTime() + 6 * 86_400_000) : null
  const weekLabel = weekStart ? `${new Date(weekStart).getMonth() + 1}/${new Date(weekStart).getDate()}〜${weekEnd ? `${weekEnd.getMonth() + 1}/${weekEnd.getDate()}` : ''}` : ''

  // ボスフェーズ計算
  const currentPhaseIndex = BOSS_PHASES.reduce((idx, p, i) => teamTotal >= p.threshold ? i : idx, 0)
  const phase = BOSS_PHASES[currentPhaseIndex]
  const prevThreshold = phase.threshold
  const damageInPhase = Math.min(teamTotal - prevThreshold, phase.hp)
  const bossHpPct = Math.max(0, Math.round(((phase.hp - damageInPhase) / phase.hp) * 100))
  const allDefeated = teamTotal >= CHALLENGE_GOAL
  const earnedCount = badges.filter(b => b.earned).length

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-200 mb-1">Gamification</p>
        <h1 className="text-2xl font-bold">ミッション</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-fuchsia-200 text-sm">保有ポイント</span>
          <span className="text-xl font-black">⭐ {myPoints.toLocaleString()}pt</span>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
        {([['quests', '📋 クエスト'], ['boss', '⚔️ ボス'], ['badges', `🏅 バッジ (${earnedCount})`]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── クエストタブ ── */}
      {tab === 'quests' && (
        <div>
          <p className="text-xs text-gray-400 mb-4 text-right">今週 {weekLabel}</p>
          <div className="space-y-3">
            {quests.map(q => {
              const pct = Math.round((q.current / q.target) * 100)
              const msg = claimMsg?.id === q.id ? claimMsg : null
              return (
                <div key={q.id} className={`rounded-2xl border p-4 ${q.claimed ? 'opacity-60' : q.completed ? 'ring-2 ring-fuchsia-400' : ''} ${q.bgColor}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{q.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{q.title}</p>
                        <p className="text-xs text-gray-500">{q.desc}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">+{q.reward}pt</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${q.barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-600 shrink-0">{q.current}/{q.target}</span>
                  </div>
                  {msg && (
                    <p className={`text-xs font-bold mb-1 ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.msg}</p>
                  )}
                  {q.completed && !q.claimed ? (
                    <button onClick={() => handleClaim(q.id)} disabled={claiming === q.id}
                      className="w-full py-1.5 bg-fuchsia-500 text-white text-sm font-bold rounded-xl hover:bg-fuchsia-600 disabled:opacity-50 transition-colors">
                      {claiming === q.id ? '受け取り中...' : '🎁 報酬を受け取る'}
                    </button>
                  ) : q.claimed ? (
                    <p className="text-xs text-center text-gray-400 font-medium">✅ 受け取り済み</p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ボスタブ ── */}
      {tab === 'boss' && (
        <div>
          {allDefeated ? (
            <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-6 text-center text-white shadow-lg">
              <div className="text-6xl mb-3">🎉</div>
              <h2 className="text-2xl font-black">全ボス撃破！</h2>
              <p className="text-sm mt-2 opacity-80">チーム200開通チャレンジ達成！</p>
              <p className="text-5xl font-black mt-4">{teamTotal} 件</p>
            </div>
          ) : (
            <div>
              {/* 現在のボス */}
              <div className={`bg-gradient-to-br ${phase.color} rounded-2xl p-5 text-white shadow-lg mb-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">フェーズ {currentPhaseIndex + 1}/4</span>
                  <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">{now.getFullYear()}年{now.getMonth() + 1}月</span>
                </div>
                <div className="text-center my-4">
                  <div className="text-7xl mb-2">{phase.icon}</div>
                  <h2 className="text-2xl font-black">{phase.name}</h2>
                </div>
                <div className="mb-1 flex items-center justify-between text-sm font-bold">
                  <span>HP</span>
                  <span>{phase.hp - damageInPhase} / {phase.hp}</span>
                </div>
                <div className="h-4 bg-white/30 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${bossHpPct}%` }} />
                </div>
                <p className="text-center text-sm font-bold opacity-90">
                  チーム合計 <span className="text-2xl font-black">{teamTotal}</span> 件のダメージ！
                </p>
                <p className="text-center text-xs opacity-70 mt-1">
                  次のフェーズまであと {Math.min(BOSS_PHASES[currentPhaseIndex].threshold + BOSS_PHASES[currentPhaseIndex].hp - teamTotal, CHALLENGE_GOAL - teamTotal)} 件
                </p>
              </div>

              {/* 残りボス */}
              <div className="grid grid-cols-4 gap-2">
                {BOSS_PHASES.map((p, i) => {
                  const defeated = teamTotal >= p.threshold + p.hp
                  const isCurrent = i === currentPhaseIndex
                  return (
                    <div key={p.name} className={`rounded-xl p-2 text-center border ${defeated ? 'bg-gray-100 border-gray-200 opacity-50' : isCurrent ? 'bg-white border-fuchsia-300 ring-2 ring-fuchsia-400' : 'bg-white border-gray-200'}`}>
                      <div className={`text-2xl mb-1 ${defeated ? 'grayscale' : ''}`}>{defeated ? '💀' : p.icon}</div>
                      <p className="text-xs font-bold text-gray-700 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{defeated ? '撃破' : isCurrent ? '戦闘中' : '未出現'}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── バッジタブ ── */}
      {tab === 'badges' && (
        <div>
          <p className="text-xs text-gray-400 mb-4">{earnedCount}/{badges.length} 個獲得</p>
          <div className="grid grid-cols-2 gap-3">
            {badges.map(b => (
              <div key={b.id} className={`rounded-2xl border p-4 ${b.earned ? b.color : 'bg-gray-50 border-gray-200 opacity-40 grayscale'}`}>
                <div className="text-3xl mb-1">{b.icon}</div>
                <p className="text-sm font-bold text-gray-800">{b.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{b.desc}</p>
                {b.earned && b.earnedAt && (
                  <p className="text-[10px] text-gray-400 mt-1">{b.earnedAt.slice(0, 10)} 獲得</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
