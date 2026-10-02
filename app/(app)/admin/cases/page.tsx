'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { getPastMonths } from '@/lib/hkr'

type Reason = 'construction_unconfirmed' | 'activation_missing' | 'update_overdue' | 'review_pending'

type OverviewItem = {
  id: number
  type: string
  name: string
  user_id: number
  staff_name: string
  updated_at: string
  reason: Reason
}

type OverviewData = {
  items: OverviewItem[]
  counts: { constructionUnconfirmed: number; activationMissing: number; updateOverdue: number; reviewPending: number }
}

type User = { id: number; name: string; role: string }

const TYPE_LABELS: Record<string, string> = {
  sonet: 'So-net', nifty: '@nifty光', sbhikari: 'SB光',
  wimax_direct: 'WiMAX直せち', sbair_direct: 'SBAir直せち',
  wimax_post: 'WiMAX後送り', sbair_post: 'SBAir後送り',
}

const REASON_TABS: { key: Reason; label: string; emoji: string }[] = [
  { key: 'construction_unconfirmed', label: '工事日未確認', emoji: '🏗️' },
  { key: 'activation_missing', label: '開通結果未入力', emoji: '📋' },
  { key: 'update_overdue', label: '更新期限超過', emoji: '⏰' },
  { key: 'review_pending', label: '他者確認待ち', emoji: '👀' },
]

const monthOptions = getPastMonths(12).map(({ year, month, label }) => ({
  value: `${year}-${String(month).padStart(2, '0')}`,
  label: `${year}年${label}`,
}))

export default function AdminCasesPage() {
  const [role, setRole] = useState('')
  const [roleLoaded, setRoleLoaded] = useState(false)
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [monthFilter, setMonthFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [reasonTab, setReasonTab] = useState<Reason>('construction_unconfirmed')
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setRole(d.role ?? '')
      setMyUserId(d.id ?? d.userId ?? null)
      setRoleLoaded(true)
    })
    fetch('/api/users').then(r => (r.ok ? r.json() : [])).then((users: User[]) => {
      setMembers(Array.isArray(users) ? users.filter(u => u.role !== 'viewer') : [])
    }).catch(() => {})
  }, [])

  const confirmItem = async (id: number) => {
    setData((prev) => prev ? { ...prev, items: prev.items.filter((it) => !(it.id === id && it.reason === 'review_pending')) } : prev)
    await fetch('/api/activation/review', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, confirmed: true }),
    })
  }

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (monthFilter !== 'all') {
      const [y, m] = monthFilter.split('-')
      params.set('year', y)
      params.set('month', String(parseInt(m, 10)))
    }
    if (userFilter !== 'all') params.set('userId', userFilter)
    fetch(`/api/activation/overview?${params.toString()}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [monthFilter, userFilter])

  if (!roleLoaded) return <div className="p-6 flex items-center justify-center min-h-screen"><p className="text-gray-400">読み込み中...</p></div>
  if (role === 'member') return <div className="p-6 text-center text-gray-400">このページはマネージャーのみ閲覧できます</div>

  const countMap: Record<Reason, number> = {
    construction_unconfirmed: data?.counts.constructionUnconfirmed ?? 0,
    activation_missing: data?.counts.activationMissing ?? 0,
    update_overdue: data?.counts.updateOverdue ?? 0,
    review_pending: data?.counts.reviewPending ?? 0,
  }
  const filteredItems = (data?.items ?? []).filter((it) => it.reason === reasonTab)

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-rose-600 to-orange-500 rounded-2xl px-6 py-5 text-white shadow-lg">
        <p className="text-xs text-rose-100 uppercase tracking-widest mb-1">Case Review</p>
        <h1 className="text-2xl font-bold">案件確認</h1>
        <p className="text-sm text-rose-100 mt-1">工事日未確認・開通結果未入力・更新期限超過・他者確認待ちの案件を自動抽出</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white"
        >
          <option value="all">全期間</option>
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white"
        >
          <option value="all">全員</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {REASON_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setReasonTab(t.key)}
            className={`rounded-2xl border p-4 text-left transition ${
              reasonTab === t.key ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <p className="text-xs text-gray-500 mb-1">{t.emoji} {t.label}</p>
            <p className={`text-2xl font-bold ${countMap[t.key] > 0 ? 'text-rose-600' : 'text-gray-300'}`}>{countMap[t.key]}<span className="text-sm font-normal text-gray-400 ml-1">件</span></p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">{REASON_TABS.find((t) => t.key === reasonTab)?.label}の一覧</h2>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-10">読み込み中...</p>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-emerald-600">
            <CheckCircle2 size={18} />
            <p className="text-sm font-medium">該当する案件はありません</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredItems.map((it) => (
              <div key={`${it.reason}-${it.id}`} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <AlertCircle size={15} className="text-rose-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{it.name || '（名前未入力）'}</p>
                    <p className="text-xs text-gray-400">{TYPE_LABELS[it.type] ?? it.type} ・ 担当: {it.staff_name}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-3">
                  <div>
                    <p className="text-xs text-gray-400">最終更新</p>
                    <p className="text-xs text-gray-600 font-medium">{it.updated_at ? it.updated_at.slice(0, 10) : '未更新'}</p>
                  </div>
                  {it.reason === 'review_pending' && it.user_id !== myUserId && (
                    <button
                      onClick={() => confirmItem(it.id)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-500 text-white hover:bg-violet-600 transition"
                    >
                      確認する
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
