'use client'

import { useState, useEffect } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const PARAM_LABELS: Record<string, string> = {
  activation:  '開通力',
  cancel:      '解除量',
  hkr:         '定着率',
  activity:    'PP変換率',
  followup:    '早期非キャンセル率',
  consistency: '継続力',
  growth:      '成長速度',
}

type Params = Record<string, number>

export default function StatusRadarWidget() {
  const [params, setParams] = useState<Params | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/my/status')
      .then(r => r.json())
      .then(d => { setParams(d.params ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="h-40 flex items-center justify-center text-sm text-gray-400">読み込み中...</div>
  )

  if (!params) return null

  const radarData = Object.entries(params).map(([key, val]) => ({
    param: PARAM_LABELS[key],
    score: val,
    fullMark: 100,
  }))

  const totalScore = Math.round(Object.values(params).reduce((s, v) => s + v, 0) / 6)

  const scoreColor = totalScore >= 70 ? 'text-green-600' : totalScore >= 45 ? 'text-yellow-500' : 'text-red-500'

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-700">個人ステータス</h2>
        <Link
          href="/status"
          className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          詳細を見る <ChevronRight size={14} />
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-6">
          {/* レーダーチャート */}
          <div className="w-44 h-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius={60}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="param" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* スコア + パラメーター一覧 */}
          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <p className="text-xs text-gray-400">総合スコア</p>
              <p className={`text-4xl font-bold ${scoreColor}`}>{totalScore}<span className="text-base text-gray-400 ml-1">/ 100</span></p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(params).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{PARAM_LABELS[key]}</span>
                  <span className={`font-bold ${val >= 70 ? 'text-green-600' : val >= 45 ? 'text-yellow-500' : 'text-red-500'}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
