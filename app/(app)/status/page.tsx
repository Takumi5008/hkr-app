'use client'

import { useState, useEffect } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, Cell,
} from 'recharts'
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Link from 'next/link'

type Params = Record<string, number>

type StatusData = {
  params: Params
  rawData: { avgMonthlyActivation: number; hkrAvg: number; avgDailyActions: number; followupRate: number; loginStreak: number; growthRate: number }
  challenges: { key: string; label: string; score: number; action: string }[]
  monthlyHistory: { year: number; month: number; label: string; activation: number; cancel: number; hkr: number | null }[]
  teamGrowth: { year: number; month: number; label: string; mine: number; teamAvg: number }[]
  members: { userId: number; name: string; isMe: boolean; history: number[] }[]
  pace: { thisMonthActivation: number; projectedActivation: number; daysElapsed: number; daysRemaining: number; totalDays: number; dailyPace: number }
  correlation: { key: string; label: string; corr: number }[]
  reviewGrowth: { label: string; challenge: string; nextGoal: string; activation: number; nextActivation: number | null; improvement: number | null }[]
}

type TrainingData = {
  members: { id: number; name: string; isNew: boolean; joinedAt: string; avgActivation: number; hkrAvg: number; followupRate: number; avgDailyActions: number; loginStreak: number; scores: Record<string, number>; totalScore: number; needsSupport: boolean; monthlyActivations: number[]; monthLabels: string[] }[]
  newMembers: TrainingData['members']
  veterans: TrainingData['members']
  teamAvgActivation: number
}

const PARAM_LABELS: Record<string, string> = {
  acquisition: '獲得力', retention: '定着力', activity: '行動量',
  followup: 'フォロー力', consistency: '継続力', growth: '成長速度',
}
const PARAM_DESC: Record<string, string> = {
  acquisition: '月平均獲得数', retention: 'HKR平均', activity: '1日の平均行動数',
  followup: 'week_after実施率', consistency: 'ログイン継続日数', growth: '先月比成長率',
}

function sc(s: number) { return s >= 80 ? 'text-green-600' : s >= 55 ? 'text-yellow-600' : 'text-red-500' }
function scoreBg(s: number) { return s >= 80 ? 'bg-green-50 border-green-200' : s >= 55 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200' }
function BarMeter({ score }: { score: number }) {
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-green-500' : score >= 55 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${score}%` }} />
    </div>
  )
}
function GrowthBadge({ v }: { v: number | null }) {
  if (v === null) return <span className="text-xs text-gray-400">—</span>
  if (v > 0) return <span className="flex items-center gap-0.5 text-xs font-bold text-green-600"><TrendingUp size={12} />+{v}件</span>
  if (v < 0) return <span className="flex items-center gap-0.5 text-xs font-bold text-red-500"><TrendingDown size={12} />{v}件</span>
  return <span className="flex items-center gap-0.5 text-xs font-bold text-gray-400"><Minus size={12} />±0</span>
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899']

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null)
  const [training, setTraining] = useState<TrainingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<{ id: number; name: string }[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [role, setRole] = useState<string>('member')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setRole(d.role ?? 'member')
      if (d.role === 'manager' || d.role === 'admin' || d.role === 'viewer') {
        fetch('/api/team').then(r => r.json()).then(list => {
          if (Array.isArray(list)) setMembers(list.map((item: any) => ({ id: item.user.id, name: item.user.name })))
        }).catch(() => {})
        fetch('/api/my/training').then(r => r.json()).then(setTraining).catch(() => {})
      }
    }).catch(() => {})
  }, [])

  const isManager = role === 'manager' || role === 'admin' || role === 'viewer'

  useEffect(() => {
    setLoading(true)
    const param = selectedUserId ? `?userId=${selectedUserId}` : ''
    fetch(`/api/my/status${param}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selectedUserId])

  if (loading) return <div className="p-6 flex items-center justify-center min-h-screen"><p className="text-gray-400">読み込み中...</p></div>
  if (!data) return <div className="p-6 text-center text-gray-400">データを取得できませんでした</div>

  const { params, rawData, challenges, teamGrowth, members: allMembers, pace, correlation, reviewGrowth } = data
  const radarData = Object.entries(params).map(([key, val]) => ({ param: PARAM_LABELS[key], score: val, fullMark: 100 }))
  const totalScore = Math.round(Object.values(params).reduce((s, v) => s + v, 0) / 6)
  const pacePercent = Math.min(100, Math.round((pace.daysElapsed / pace.totalDays) * 100))
  const activationPercent = Math.min(100, pace.totalDays > 0 ? Math.round((pace.thisMonthActivation / Math.max(1, pace.projectedActivation)) * 100) : 0)

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">個人ステータス</h1>
        {isManager && members.length > 0 && (
          <select value={selectedUserId ?? ''} onChange={e => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="">自分</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
      </div>

      {/* 総合スコア */}
      <div className="bg-gradient-to-br from-indigo-950 to-indigo-800 rounded-2xl p-6 text-white text-center shadow-lg">
        <p className="text-sm text-indigo-300 mb-1">総合スコア</p>
        <p className="text-6xl font-bold">{totalScore}</p>
        <p className="text-indigo-300 mt-1 text-sm">/ 100</p>
        <div className="mt-4 flex justify-center gap-2 flex-wrap">
          {Object.entries(params).map(([key, val]) => (
            <span key={key} className={`text-xs px-2 py-1 rounded-full font-medium ${val >= 80 ? 'bg-green-500/30 text-green-200' : val >= 55 ? 'bg-yellow-400/30 text-yellow-200' : 'bg-red-400/30 text-red-200'}`}>
              {PARAM_LABELS[key]} {val}
            </span>
          ))}
        </div>
      </div>

      {/* レーダーチャート + パラメーター */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">パラメーター</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="param" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Radar name="スコア" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {Object.entries(params).map(([key, val]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{PARAM_LABELS[key]}</span>
                    <span className="text-xs text-gray-400 ml-2">{PARAM_DESC[key]}</span>
                  </div>
                  <span className={`text-sm font-bold ${sc(val)}`}>{val}</span>
                </div>
                <BarMeter score={val} />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center border-t border-gray-100 pt-4">
          <div><p className="text-xs text-gray-400">月平均獲得</p><p className="text-lg font-bold text-gray-800">{rawData.avgMonthlyActivation}件</p></div>
          <div><p className="text-xs text-gray-400">HKR平均</p><p className="text-lg font-bold text-gray-800">{rawData.hkrAvg}%</p></div>
          <div><p className="text-xs text-gray-400">フォロー実施率</p><p className="text-lg font-bold text-gray-800">{rawData.followupRate}%</p></div>
          <div><p className="text-xs text-gray-400">日均行動数</p><p className="text-lg font-bold text-gray-800">{rawData.avgDailyActions}件</p></div>
          <div><p className="text-xs text-gray-400">継続ストリーク</p><p className="text-lg font-bold text-gray-800">🔥{rawData.loginStreak}日</p></div>
          <div><p className="text-xs text-gray-400">先月比</p><p className={`text-lg font-bold ${rawData.growthRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>{rawData.growthRate >= 0 ? '+' : ''}{rawData.growthRate}%</p></div>
        </div>
      </div>

      {/* ① ペース管理 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">📅 今月のペース管理</h2>
        <div className="grid grid-cols-3 gap-3 text-center mb-5">
          <div className="bg-indigo-50 rounded-xl p-3">
            <p className="text-xs text-indigo-400 mb-1">今月の開通数</p>
            <p className="text-3xl font-bold text-indigo-700">{pace.thisMonthActivation}</p>
            <p className="text-xs text-indigo-400">件</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-xs text-emerald-400 mb-1">月末予測</p>
            <p className="text-3xl font-bold text-emerald-700">{pace.projectedActivation}</p>
            <p className="text-xs text-emerald-400">件ペース</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xs text-amber-400 mb-1">残り日数</p>
            <p className="text-3xl font-bold text-amber-700">{pace.daysRemaining}</p>
            <p className="text-xs text-amber-400">日</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>月日程の進捗</span>
              <span>{pace.daysElapsed}/{pace.totalDays}日（{pacePercent}%）</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pacePercent}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>1日あたりペース</span>
              <span>{pace.dailyPace}件/日</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(100, pace.dailyPace * 10)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 課題推薦 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-3">🎯 今取り組むべき課題</h2>
        <div className="space-y-3">
          {challenges.map((c, i) => (
            <div key={c.key} className={`rounded-xl border p-4 ${scoreBg(c.score)}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-gray-500 w-5">{i + 1}</span>
                <span className="text-sm font-semibold text-gray-800">{c.label}</span>
                <span className={`text-xs font-bold ml-auto ${sc(c.score)}`}>{c.score}点</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed pl-7">{c.action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ④ 行動→開通の相関 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-1">📊 行動→開通の効き目スコア</h2>
        <p className="text-xs text-gray-400 mb-4">過去6ヶ月のデータから、どの行動が開通数に最も影響しているかを示します（-1〜1）</p>
        <div className="space-y-3">
          {correlation.map((c, i) => {
            const pct = Math.round(((c.corr + 1) / 2) * 100)
            const isTop = i === 0 && c.corr > 0.3
            return (
              <div key={c.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 flex items-center gap-1.5">
                    {isTop && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">最効果的</span>}
                    {c.label}
                  </span>
                  <span className={`text-sm font-bold ${c.corr >= 0.3 ? 'text-green-600' : c.corr >= 0 ? 'text-gray-500' : 'text-red-400'}`}>
                    {c.corr > 0 ? '+' : ''}{c.corr.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${c.corr >= 0.3 ? 'bg-green-500' : c.corr >= 0 ? 'bg-gray-300' : 'bg-red-300'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ⑤ 振り返りと成長連動 */}
      {reviewGrowth && reviewGrowth.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-1">🔄 振り返り × 成長連動（PDCA）</h2>
          <p className="text-xs text-gray-400 mb-4">各月の課題と、翌月の開通数変化を照らし合わせます</p>
          <div className="space-y-4">
            {reviewGrowth.map((r: any) => (
              <div key={r.label} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">{r.label}の振り返り</span>
                  <GrowthBadge v={r.improvement} />
                </div>
                {r.challenge && (
                  <div className="mb-1.5">
                    <p className="text-xs text-gray-400 mb-0.5">📝 課題として挙げたこと</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{r.challenge}</p>
                  </div>
                )}
                {r.nextGoal && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">🎯 掲げた目標</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{r.nextGoal}</p>
                  </div>
                )}
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>その月の開通: <strong className="text-gray-800">{r.activation}件</strong></span>
                  {r.nextActivation !== null && <span>翌月: <strong className="text-gray-800">{r.nextActivation}件</strong></span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 育成比較：成長曲線 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">📈 成長曲線（チーム比較）</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={teamGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v, name) => [`${v}件`, name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="mine" name="自分" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="teamAvg" name="チーム平均" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {isManager && allMembers.length > 1 && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">メンバー別成長曲線</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={teamGrowth.map((g, idx) => {
                  const row: Record<string, unknown> = { label: g.label }
                  allMembers.forEach(m => { row[m.name] = m.history[idx] ?? 0 })
                  return row
                })}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v, name) => [`${v}件`, name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {allMembers.map((m, i) => (
                    <Line key={m.userId} type="monotone" dataKey={m.name}
                      stroke={m.isMe ? '#6366f1' : COLORS[i % COLORS.length]}
                      strokeWidth={m.isMe ? 2.5 : 1.5} dot={m.isMe ? { r: 3 } : false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ② 新人育成ダッシュボード（管理者のみ） */}
      {isManager && training && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">🌱 新人育成ダッシュボード</h2>
              <p className="text-xs text-gray-400 mt-0.5">入社90日以内のメンバー vs チーム平均</p>
            </div>
            <Link href="/team-report" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg">
              詳細 <ChevronRight size={12} />
            </Link>
          </div>

          {training.newMembers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">現在入社90日以内のメンバーはいません</p>
          ) : (
            <div className="space-y-4">
              {training.newMembers.map(m => (
                <div key={m.id} className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/40">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-bold text-gray-800">{m.name}</span>
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">新人</span>
                      <span className="ml-1 text-xs text-gray-400">入社: {m.joinedAt}</span>
                    </div>
                    <span className={`text-lg font-bold ${sc(m.totalScore)}`}>{m.totalScore}点</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {Object.entries(m.scores).map(([key, val]) => (
                      <div key={key} className="text-center">
                        <p className="text-xs text-gray-400 mb-1">{PARAM_LABELS[key]}</p>
                        <p className={`text-sm font-bold ${sc(val)}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                  {/* 月次開通推移 */}
                  <div className="flex items-end gap-2">
                    {m.monthlyActivations.map((v, i) => (
                      <div key={i} className="flex-1 text-center">
                        <div className="flex justify-center items-end h-10">
                          <div className="w-full bg-indigo-200 rounded-t" style={{ height: `${Math.min(100, v * 15)}%`, minHeight: v > 0 ? '4px' : '2px' }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{m.monthLabels[i]}</p>
                        <p className="text-xs font-bold text-gray-700">{v}</p>
                      </div>
                    ))}
                  </div>
                  {m.needsSupport && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-red-600">⚠️ サポート推奨: チーム平均({training.teamAvgActivation}件)の50%未満</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* チーム全体のスコア分布 */}
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">全メンバー スコア一覧</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...training.members].sort((a, b) => b.totalScore - a.totalScore)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip formatter={(v) => [`${v}点`, '総合スコア']} />
                  <Bar dataKey="totalScore" radius={[4, 4, 0, 0]}>
                    {training.members.map((m, i) => (
                      <Cell key={i} fill={m.isNew ? '#6366f1' : '#d1d5db'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" />新人（90日以内）</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-300 inline-block" />ベテラン</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
