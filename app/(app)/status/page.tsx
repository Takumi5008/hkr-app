'use client'

import { useState, useEffect } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Params = {
  acquisition: number
  retention: number
  activity: number
  followup: number
  consistency: number
  growth: number
}

type StatusData = {
  params: Params
  rawData: {
    avgMonthlyActivation: number
    hkrAvg: number
    avgDailyActions: number
    followupRate: number
    loginStreak: number
    growthRate: number
  }
  challenges: { key: string; label: string; score: number; action: string }[]
  monthlyHistory: { year: number; month: number; label: string; activation: number; cancel: number; hkr: number | null }[]
  teamGrowth: { year: number; month: number; label: string; mine: number; teamAvg: number }[]
  members: { userId: number; name: string; isMe: boolean; history: number[] }[]
}

const PARAM_LABELS: Record<string, string> = {
  acquisition: '獲得力',
  retention:   '定着力',
  activity:    '行動量',
  followup:    'フォロー力',
  consistency: '継続力',
  growth:      '成長速度',
}

const PARAM_DESC: Record<string, string> = {
  acquisition: '月平均獲得数',
  retention:   'HKR平均',
  activity:    '1日の平均行動数',
  followup:    'week_after実施率',
  consistency: 'ログイン継続日数',
  growth:      '先月比成長率',
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-green-600'
  if (s >= 55) return 'text-yellow-600'
  return 'text-red-500'
}

function scoreBg(s: number) {
  if (s >= 80) return 'bg-green-50 border-green-200'
  if (s >= 55) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

function BarMeter({ score }: { score: number }) {
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-green-500' : score >= 55 ? 'bg-yellow-400' : 'bg-red-400'}`}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899']

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null)
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

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-screen">
      <p className="text-gray-400">読み込み中...</p>
    </div>
  )

  if (!data) return (
    <div className="p-6 text-center text-gray-400">データを取得できませんでした</div>
  )

  const { params, rawData, challenges, teamGrowth, members: allMembers } = data

  const radarData = Object.entries(params).map(([key, val]) => ({
    param: PARAM_LABELS[key],
    score: val,
    fullMark: 100,
  }))

  const totalScore = Math.round(Object.values(params).reduce((s, v) => s + v, 0) / 6)

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">個人ステータス</h1>
        {isManager && members.length > 0 && (
          <select
            value={selectedUserId ?? ''}
            onChange={e => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">自分</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
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

      {/* レーダーチャート + パラメーター一覧 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">パラメーター</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* レーダーチャート */}
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="param" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Radar name="スコア" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* パラメーター詳細 */}
          <div className="space-y-3">
            {Object.entries(params).map(([key, val]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{PARAM_LABELS[key]}</span>
                    <span className="text-xs text-gray-400 ml-2">{PARAM_DESC[key]}</span>
                  </div>
                  <span className={`text-sm font-bold ${scoreColor(val)}`}>{val}</span>
                </div>
                <BarMeter score={val} />
              </div>
            ))}
          </div>
        </div>

        {/* 生データ */}
        <div className="mt-4 grid grid-cols-3 gap-3 text-center border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs text-gray-400">月平均獲得</p>
            <p className="text-lg font-bold text-gray-800">{rawData.avgMonthlyActivation}件</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">HKR平均</p>
            <p className="text-lg font-bold text-gray-800">{rawData.hkrAvg}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">フォロー実施率</p>
            <p className="text-lg font-bold text-gray-800">{rawData.followupRate}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">日均行動数</p>
            <p className="text-lg font-bold text-gray-800">{rawData.avgDailyActions}件</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">継続ストリーク</p>
            <p className="text-lg font-bold text-gray-800">🔥{rawData.loginStreak}日</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">先月比</p>
            <p className={`text-lg font-bold ${rawData.growthRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {rawData.growthRate >= 0 ? '+' : ''}{rawData.growthRate}%
            </p>
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
                <span className={`text-xs font-bold ml-auto ${scoreColor(c.score)}`}>{c.score}点</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed pl-7">{c.action}</p>
            </div>
          ))}
        </div>
      </div>

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
              <Line
                type="monotone"
                dataKey="mine"
                name="自分"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="teamAvg"
                name="チーム平均"
                stroke="#d1d5db"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* メンバー別比較（管理者向け） */}
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
                    <Line
                      key={m.userId}
                      type="monotone"
                      dataKey={m.name}
                      stroke={m.isMe ? '#6366f1' : COLORS[i % COLORS.length]}
                      strokeWidth={m.isMe ? 2.5 : 1.5}
                      dot={m.isMe ? { r: 3 } : false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
