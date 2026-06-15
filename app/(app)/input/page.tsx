'use client'

import { useState, useEffect } from 'react'
import { calcHKR, formatMonth } from '@/lib/hkr'
import { CheckCircle, X, Plus, Pencil, Trash2, Save } from 'lucide-react'
import CelebrationOverlay from '@/components/CelebrationOverlay'

type FormData = { [K: string]: { cancel: string; activation: string; remaining: string; expected: string } }
type Tab = 'input' | 'calendar' | 'products'

type CalendarEntry = {
  id: number
  activation_date: string
  customer_name: string
  line_type: string
  construction_type: string
  status: string
}

const COMMISSION = 15000
const fmt = (n: number) => `¥${n.toLocaleString()}`
const cycleStatus = (s: string) => s === '' ? '○' : s === '○' ? '×' : ''
const statusEmoji = (s: string) => s === '○' ? '⭕' : s === '×' ? '❌' : '🔘'
const cycleConstruction = (s: string) => s === '' ? '🐜' : s === '🐜' ? '🍐' : ''

// activation_date を月*100+日のソートキーに変換（5/25→525, 6/1→601）
const calSortKey = (dateStr: string): number => {
  if (!dateStr) return 99999
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return parseInt(iso[2]) * 100 + parseInt(iso[3])
  const md = dateStr.match(/^(\d{1,2})[\/月](\d{1,2})/)
  if (md) return parseInt(md[1]) * 100 + parseInt(md[2])
  const d = dateStr.match(/^(\d+)$/)
  if (d) return parseInt(d[1])
  return 99999
}

// 業務期間ラベル: month=5 → "5/25〜6/24"
const periodLabel = (m: number): string => {
  const nm = m === 12 ? 1 : m + 1
  return `${m}/25〜${nm}/24`
}

export default function InputPage() {
  const now = new Date()
  const bm = getBusinessMonth(now)
  const [year, setYear] = useState(bm.year)
  const [month, setMonth] = useState(bm.month)
  const [products, setProducts] = useState<string[]>([])
  const [form, setForm] = useState<FormData>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [celebrationCount, setCelebrationCount] = useState(0)
  const [savedActivation, setSavedActivation] = useState<Record<string, number>>({})

  const [role, setRole] = useState<string>('')
  const [tab, setTab] = useState<Tab>('input')

  // 開通カレンダー
  const [calEntries, setCalEntries] = useState<CalendarEntry[]>([])
  const [calEditingId, setCalEditingId] = useState<number | 'new' | null>(null)
  const [calForm, setCalForm] = useState({ activation_date: '', customer_name: '', line_type: '', construction_type: '', status: '' })
  const [calMembers, setCalMembers] = useState<{ id: number; name: string }[]>([])
  const [calSelectedUserId, setCalSelectedUserId] = useState<number | null>(null)
  const [inputSelectedUserId, setInputSelectedUserId] = useState<number | null>(null)
  const [resyncing, setResyncing] = useState(false)
  const [suggestions, setSuggestions] = useState<Record<string, { cancel: number; activation: number }>>({})
  const [applying, setApplying] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncAllResult, setSyncAllResult] = useState<string | null>(null)

  // 回線管理
  const [productItems, setProductItems] = useState<{ id: number; name: string; activation_type: string | null }[]>([])
  const [newProduct, setNewProduct] = useState('')
  const [productError, setProductError] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)
  const [productSuccess, setProductSuccess] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        setRole(d.role)
        if (d.role === 'manager' || d.role === 'viewer' || d.role === 'admin') {
          fetch('/api/users')
            .then((r) => r.json())
            .then((users: { id: number; name: string; role: string }[]) => {
              setCalMembers(users.filter((u) => u.role !== 'viewer'))
            })
        }
      })
  }, [])

  const fetchCalendar = (userId?: number | null) => {
    const userParam = userId ? `&userId=${userId}` : ''
    fetch(`/api/opening-calendar?year=${year}&month=${month}${userParam}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCalEntries(data) })
  }

  // カレンダーデータ取得（メンバー切替・月切替・タブ切替で実行）
  useEffect(() => {
    if (tab !== 'calendar') return
    fetchCalendar(calSelectedUserId)
  }, [year, month, tab, calSelectedUserId])

  // 再同期はタブを開いたときだけ（メンバー切替では走らせない）
  useEffect(() => {
    if (tab !== 'calendar') return
    if (role === 'manager' || role === 'admin') {
      fetch('/api/activation/resync', { method: 'POST' }).catch(() => {})
    }
  }, [tab, role])

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data: { id: number; name: string; activation_type: string | null }[]) => {
        setProductItems(data)
        const names = data.map((p) => p.name)
        setProducts(names)
        setForm(Object.fromEntries(names.map((n) => [n, { cancel: '', activation: '', remaining: '', expected: '' }])))
      })
  }, [])

  useEffect(() => {
    if (products.length === 0) return
    async function load() {
      const userParam = inputSelectedUserId ? `&userId=${inputSelectedUserId}` : ''
      const [res, suggestRes] = await Promise.all([
        fetch(`/api/records?year=${year}&month=${month}${userParam}`),
        fetch(`/api/records/suggest?year=${year}&month=${month}${userParam}`),
      ])
      if (!res.ok) return
      const data = await res.json()
      const next: FormData = Object.fromEntries(products.map((n) => [n, { cancel: '', activation: '', remaining: '', expected: '' }]))
      const savedAct: Record<string, number> = {}
      for (const r of data) {
        if (next[r.product] !== undefined) {
          next[r.product] = {
            cancel: String(r.cancel_count),
            activation: String(r.activation_count),
            remaining: r.remaining_opening > 0 ? String(r.remaining_opening) : '',
            expected:  r.expected_opening  > 0 ? String(r.expected_opening)  : '',
          }
          savedAct[r.product] = r.activation_count
        }
      }
      setForm(next)
      setSavedActivation(savedAct)
      if (suggestRes.ok) setSuggestions(await suggestRes.json())
    }
    load()
  }, [year, month, products, inputSelectedUserId])

  function handleChange(product: string, field: 'cancel' | 'activation' | 'remaining' | 'expected', value: string) {
    if (value !== '' && !/^\d+$/.test(value)) return
    setForm((prev) => ({ ...prev, [product]: { ...prev[product], [field]: value } }))
  }

  async function handleSave() {
    setError('')
    setLoading(true)
    const newActivation: Record<string, number> = {}
    for (const product of products) {
      const count = parseInt(form[product]?.activation || '0', 10)
      newActivation[product] = count
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year, month, product,
          cancel_count:      parseInt(form[product].cancel     || '0', 10),
          activation_count:  count,
          remaining_opening: parseInt(form[product].remaining  || '0', 10),
          expected_opening:  parseInt(form[product].expected   || '0', 10),
          ...(inputSelectedUserId ? { userId: inputSelectedUserId } : {}),
        }),
      })
      if (!res.ok) { setError('保存に失敗しました'); setLoading(false); return }
    }
    setSuccess(true)
    setLoading(false)
    setTimeout(() => setSuccess(false), 3000)
    const delta = products.reduce((sum, p) => sum + newActivation[p] - (savedActivation[p] ?? 0), 0)
    if (delta > 0) setCelebrationCount(delta)
    setSavedActivation(newActivation)
  }

  async function handleApplySuggestions() {
    if (Object.keys(suggestions).length === 0) return
    setApplying(true)
    setForm((prev) => {
      const next = { ...prev }
      for (const [product, sg] of Object.entries(suggestions)) {
        if (next[product]) {
          next[product] = {
            ...next[product],
            cancel: String(sg.cancel),
            activation: String(sg.activation),
          }
        }
      }
      return next
    })
    setApplying(false)
  }

  async function handleSyncAll() {
    setSyncingAll(true)
    setSyncAllResult(null)
    const res = await fetch('/api/records/sync-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month }),
    })
    if (res.ok) {
      const data = await res.json()
      setSyncAllResult(`✅ ${data.updated} 件を更新しました`)
      // 自分の分も再読込
      const userParam = inputSelectedUserId ? `&userId=${inputSelectedUserId}` : ''
      const [recs, sugg] = await Promise.all([
        fetch(`/api/records?year=${year}&month=${month}${userParam}`).then((r) => r.json()),
        fetch(`/api/records/suggest?year=${year}&month=${month}${userParam}`).then((r) => r.json()),
      ])
      const next: FormData = Object.fromEntries(products.map((n) => [n, { cancel: '', activation: '', remaining: '', expected: '' }]))
      for (const r of recs) {
        if (next[r.product] !== undefined) {
          next[r.product] = {
            cancel: String(r.cancel_count),
            activation: String(r.activation_count),
            remaining: r.remaining_opening > 0 ? String(r.remaining_opening) : '',
            expected: r.expected_opening > 0 ? String(r.expected_opening) : '',
          }
        }
      }
      setForm(next)
      setSuggestions(sugg)
    } else {
      setSyncAllResult('❌ 反映に失敗しました')
    }
    setSyncingAll(false)
    setTimeout(() => setSyncAllResult(null), 4000)
  }

  async function handleResync() {
    setResyncing(true)
    await fetch('/api/activation/resync', { method: 'POST' })
    fetchCalendar(calSelectedUserId)
    setResyncing(false)
  }

  async function handleCalSave() {
    if (calEditingId === 'new') {
      const res = await fetch('/api/opening-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, ...calForm }),
      })
      if (res.ok) fetchCalendar(calSelectedUserId)
    } else if (calEditingId !== null) {
      await fetch('/api/opening-calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: calEditingId, ...calForm }),
      })
      fetchCalendar(calSelectedUserId)
    }
    setCalEditingId(null)
  }

  async function handleCalToggleStatus(entry: CalendarEntry) {
    const newStatus = cycleStatus(entry.status)
    setCalEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: newStatus } : e))
    await fetch('/api/opening-calendar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, status: newStatus }),
    })
  }

  async function handleCalDelete(id: number) {
    await fetch(`/api/opening-calendar?id=${id}`, { method: 'DELETE' })
    setCalEntries((prev) => prev.filter((e) => e.id !== id))
  }

  async function handleAddProduct() {
    if (!newProduct.trim()) return
    setProductError('')
    setAddingProduct(true)
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProduct.trim() }),
    })
    if (!res.ok) {
      const data = await res.json()
      setProductError(data.error ?? '追加に失敗しました')
      setAddingProduct(false)
      return
    }
    const product = await res.json()
    setProductItems((prev) => [...prev, product])
    setProducts((prev) => [...prev, product.name])
    setForm((prev) => ({ ...prev, [product.name]: { cancel: '', activation: '' } }))
    setNewProduct('')
    setAddingProduct(false)
    setProductSuccess(true)
    setTimeout(() => setProductSuccess(false), 2000)
  }

  async function handleRenameProduct(oldName: string, newName: string) {
    if (!newName.trim() || newName.trim() === oldName) {
      setEditingId(null)
      return
    }
    setProductError('')
    const res = await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName: newName.trim() }),
    })
    if (!res.ok) {
      const data = await res.json()
      setProductError(data.error ?? '変更に失敗しました')
      return
    }
    const trimmed = newName.trim()
    setProductItems((prev) => prev.map((p) => p.name === oldName ? { ...p, name: trimmed } : p))
    setProducts((prev) => prev.map((p) => p === oldName ? trimmed : p))
    setForm((prev) => {
      const next: FormData = {}
      for (const [k, v] of Object.entries(prev)) {
        next[k === oldName ? trimmed : k] = v
      }
      return next
    })
    setEditingId(null)
  }

  async function handleDeleteProduct(name: string) {
    await fetch('/api/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setProductItems((prev) => prev.filter((p) => p.name !== name))
    setProducts((prev) => prev.filter((p) => p !== name))
    setForm((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const monthOptions = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + 6 - i, 1)
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })

  const isManager = role === 'manager' || role === 'admin'

  const calConfirmed = calEntries.filter((e) => e.status === '○').length
  const calRemaining = calEntries.filter((e) => e.status === '').length
  const calForecast  = calConfirmed + calRemaining

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {celebrationCount > 0 && (
        <CelebrationOverlay count={celebrationCount} onDone={() => setCelebrationCount(0)} />
      )}
      <div className="mb-6 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-1">Input</p>
        <h1 className="text-2xl font-bold">データ入力</h1>
        <p className="text-sm text-blue-100 mt-0.5">月別・商材別の解除数・開通数を入力</p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        <button
          onClick={() => setTab('input')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'input' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          データ入力
        </button>
        <button
          onClick={() => setTab('calendar')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          開通カレンダー
        </button>
        {isManager && (
          <button
            onClick={() => setTab('products')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'products' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            回線管理
          </button>
        )}
      </div>

      {/* データ入力タブ */}
      {tab === 'input' && (
        <>
          {isManager && (
            <div className="mb-4">
              <button
                onClick={handleSyncAll} disabled={syncingAll}
                className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {syncingAll ? '反映中...' : '🔄 全員の開通表データを一括反映'}
              </button>
              {syncAllResult && (
                <p className="mt-2 text-sm text-center text-gray-600">{syncAllResult}</p>
              )}
            </div>
          )}
          {isManager && calMembers.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-gray-500 shrink-0">メンバー</span>
              <select
                value={inputSelectedUserId ?? ''}
                onChange={(e) => setInputSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="">自分</option>
                {calMembers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">対象月</label>
            <select
              value={`${year}-${month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number)
                setYear(y); setMonth(m)
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {monthOptions.map(({ year: y, month: m }) => (
                <option key={`${y}-${m}`} value={`${y}-${m}`}>{formatMonth(y, m)}</option>
              ))}
            </select>
          </div>

          {Object.keys(suggestions).length > 0 && (
            <button
              onClick={handleApplySuggestions} disabled={applying}
              className="w-full mb-4 py-2.5 px-4 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              📋 開通表から一括反映
            </button>
          )}

          <div className="space-y-4">
            {products.map((product) => {
              const cancel = parseInt(form[product]?.cancel || '0', 10)
              const activation = parseInt(form[product]?.activation || '0', 10)
              const hkr = cancel > 0 ? calcHKR(activation, cancel) : null
              const sg = suggestions[product]

              return (
                <div key={product} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{product}</h3>
                    <div className="flex items-center gap-2">
                      {sg && (
                        <button
                          onClick={() => setForm((prev) => ({ ...prev, [product]: { ...prev[product], cancel: String(sg.cancel), activation: String(sg.activation) } }))}
                          className="text-xs px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors font-medium"
                        >
                          開通表から反映
                        </button>
                      )}
                      {hkr !== null && (
                        <span className={`text-sm font-bold ${hkr >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                          HKR: {hkr}%
                        </span>
                      )}
                    </div>
                  </div>
                  {sg && (
                    <div className="mb-3 px-3 py-2 bg-teal-50 rounded-lg text-xs text-teal-700 flex gap-4">
                      <span>📊 開通表実績：解除 <strong>{sg.cancel}</strong> 件 / 開通 <strong>{sg.activation}</strong> 件</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">解除数</label>
                      <input
                        type="text" inputMode="numeric"
                        value={form[product]?.cancel ?? ''}
                        onChange={(e) => handleChange(product, 'cancel', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">開通数</label>
                      <input
                        type="text" inputMode="numeric"
                        value={form[product]?.activation ?? ''}
                        onChange={(e) => handleChange(product, 'activation', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-400 mb-2">進捗トラッキング</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'remaining' as const, label: '残り開通数' },
                        { key: 'expected'  as const, label: '見込み開通数' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                          <input
                            type="text" inputMode="numeric"
                            value={form[product]?.[key] ?? ''}
                            onChange={(e) => handleChange(product, key, e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {error && <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {success && (
            <div className="mt-4 flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg">
              <CheckCircle size={18} /><span className="text-sm font-medium">保存しました</span>
            </div>
          )}

          <button
            onClick={handleSave} disabled={loading}
            className="mt-6 w-full py-3 px-4 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '保存中...' : `${formatMonth(year, month)}のデータを保存`}
          </button>
        </>
      )}

      {/* 開通カレンダータブ */}
      {tab === 'calendar' && (
        <>
            {/* メンバー選択（マネージャーのみ） */}
            {isManager && calMembers.length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-gray-500 shrink-0">メンバー</span>
                <select
                  value={calSelectedUserId ?? ''}
                  onChange={(e) => { setCalSelectedUserId(e.target.value ? Number(e.target.value) : null); setCalEditingId(null) }}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  <option value="">自分</option>
                  {calMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleResync}
                  disabled={resyncing}
                  className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {resyncing ? '同期中...' : '🔄 カレンダー再同期'}
                </button>
              </div>
            )}

            {/* 月選択 */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">対象期間</label>
              <select
                value={`${year}-${month}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split('-').map(Number)
                  setYear(y); setMonth(m)
                }}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {monthOptions.map(({ year: y, month: m }) => (
                  <option key={`${y}-${m}`} value={`${y}-${m}`}>{y}年 {periodLabel(m)}</option>
                ))}
              </select>
            </div>

            {/* エントリ一覧 */}
            {(() => { const canEdit = calSelectedUserId === null; return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-10">状態</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 w-20">開通日</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">お客様名</th>
                    <th className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 w-24">回線</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 w-12">工事</th>
                    {canEdit && <th className="px-3 py-2.5 w-12" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {calEntries.length === 0 && calEditingId !== 'new' && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">データがありません</td>
                    </tr>
                  )}
                  {[...calEntries].sort((a, b) => calSortKey(a.activation_date) - calSortKey(b.activation_date)).map((entry) => {
                    const isEditing = calEditingId === entry.id
                    const bg = entry.status === '○' ? 'bg-green-50/40' : entry.status === '×' ? 'bg-red-50/40' : ''
                    return (
                      <tr key={entry.id} className={bg}>
                        <td className="px-2 py-2 text-center">
                          {canEdit ? (
                            <button onClick={() => handleCalToggleStatus(entry)} className="text-lg leading-none">
                              {statusEmoji(entry.status)}
                            </button>
                          ) : (
                            <span className="text-lg leading-none">{statusEmoji(entry.status)}</span>
                          )}
                        </td>
                        {isEditing && canEdit ? (
                          <>
                            <td className="px-2 py-1.5">
                              <input
                                type="text" value={calForm.activation_date}
                                onChange={(e) => setCalForm((p) => ({ ...p, activation_date: e.target.value }))}
                                placeholder="3/1"
                                className="w-full px-2 py-1 border border-blue-400 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text" value={calForm.customer_name}
                                onChange={(e) => setCalForm((p) => ({ ...p, customer_name: e.target.value }))}
                                placeholder="お客様名"
                                className="w-full px-2 py-1 border border-blue-400 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text" value={calForm.line_type}
                                onChange={(e) => setCalForm((p) => ({ ...p, line_type: e.target.value }))}
                                placeholder="🏠 / 🌏"
                                className="w-full px-2 py-1 border border-blue-400 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <button
                                onClick={() => setCalForm((p) => ({ ...p, construction_type: cycleConstruction(p.construction_type) }))}
                                className={`w-7 h-7 rounded text-base font-bold transition-colors ${calForm.construction_type ? 'bg-amber-100' : 'bg-gray-100 opacity-30'}`}
                              >
                                {calForm.construction_type || '🐜'}
                              </button>
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center gap-1">
                                <button onClick={handleCalSave} className="text-blue-600 hover:text-blue-800">
                                  <Save size={14} />
                                </button>
                                <button onClick={() => setCalEditingId(null)} className="text-gray-400 hover:text-gray-600">
                                  <X size={14} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-gray-700 text-xs">{entry.activation_date || '-'}</td>
                            <td className="px-3 py-2 text-gray-800 text-xs font-medium">{entry.customer_name || '-'}</td>
                            <td className="px-3 py-2 text-gray-600 text-xs">{entry.line_type || '-'}</td>
                            <td className="px-3 py-2 text-center">
                              {entry.construction_type && <span className="text-base leading-none">{entry.construction_type}</span>}
                            </td>
                            {canEdit && (
                              <td className="px-2 py-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => { setCalEditingId(entry.id); setCalForm({ activation_date: entry.activation_date, customer_name: entry.customer_name, line_type: entry.line_type, construction_type: entry.construction_type, status: entry.status }) }}
                                    className="text-gray-300 hover:text-blue-500 transition"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => handleCalDelete(entry.id)} className="text-gray-300 hover:text-red-400 transition">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    )
                  })}
                  {/* 新規追加行 */}
                  {canEdit && calEditingId === 'new' && (
                    <tr>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => setCalForm((p) => ({ ...p, status: cycleStatus(p.status) }))}
                          className="text-lg leading-none"
                        >
                          {statusEmoji(calForm.status)}
                        </button>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          autoFocus
                          type="text" value={calForm.activation_date}
                          onChange={(e) => setCalForm((p) => ({ ...p, activation_date: e.target.value }))}
                          placeholder="3/1"
                          className="w-full px-2 py-1 border border-blue-400 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text" value={calForm.customer_name}
                          onChange={(e) => setCalForm((p) => ({ ...p, customer_name: e.target.value }))}
                          placeholder="お客様名"
                          className="w-full px-2 py-1 border border-blue-400 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text" value={calForm.line_type}
                          onChange={(e) => setCalForm((p) => ({ ...p, line_type: e.target.value }))}
                          placeholder="🏠 / 🌏"
                          className="w-full px-2 py-1 border border-blue-400 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => setCalForm((p) => ({ ...p, construction_type: cycleConstruction(p.construction_type) }))}
                          className={`w-7 h-7 rounded text-base font-bold transition-colors ${calForm.construction_type ? 'bg-amber-100' : 'bg-gray-100 opacity-30'}`}
                        >
                          {calForm.construction_type || '🐜'}
                        </button>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <button onClick={handleCalSave} className="text-blue-600 hover:text-blue-800">
                            <Save size={14} />
                          </button>
                          <button onClick={() => setCalEditingId(null)} className="text-gray-400 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            ); })()}

            {/* 追加ボタン */}
            {calSelectedUserId === null && calEditingId === null && (
              <button
                onClick={() => { setCalEditingId('new'); setCalForm({ activation_date: '', customer_name: '', line_type: '', construction_type: '', status: '' }) }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow mb-5"
              >
                <Plus size={15} />行を追加
              </button>
            )}

            {/* サマリー */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-500 mb-3">{year}年 {periodLabel(month)} まとめ</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: '開通数', value: calConfirmed, color: 'text-emerald-600' },
                  { label: '残り', value: calRemaining, color: 'text-indigo-600' },
                  { label: '見込み', value: calForecast, color: 'text-blue-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
                <div className="bg-indigo-50 rounded-lg px-4 py-3 text-center sm:col-span-1">
                  <p className="text-lg font-bold text-indigo-600">{fmt(calForecast * COMMISSION)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">見込み委託費</p>
                </div>
                <div className="bg-emerald-50 rounded-lg px-4 py-3 text-center sm:col-span-2">
                  <p className="text-lg font-bold text-emerald-600">{fmt(calConfirmed * COMMISSION)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">確定委託費</p>
                </div>
              </div>
            </div>
        </>
      )}

      {/* 回線管理タブ（マネージャーのみ） */}
      {tab === 'products' && isManager && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-400 mb-4">追加・削除した回線はメンバー全員のデータ入力画面に反映されます。</p>

          <ul className="space-y-2 mb-4">
            {productItems.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                {editingId === p.id ? (
                  <>
                    <input
                      autoFocus
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameProduct(p.name, editingName)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 px-2 py-1 border border-blue-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleRenameProduct(p.name, editingName)}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-800 font-medium">{p.name}</span>
                    <select
                      value={p.activation_type ?? ''}
                      onChange={async (e) => {
                        const val = e.target.value || null
                        await fetch('/api/products', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ oldName: p.name, activationType: val }),
                        })
                        setProductItems((prev) => prev.map((x) => x.id === p.id ? { ...x, activation_type: val } : x))
                      }}
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                      title="開通表との紐付け"
                    >
                      <option value="">— 紐付けなし</option>
                      <option value="sonet">So-net系</option>
                      <option value="wimax">WiMAX系</option>
                    </select>
                    <button
                      onClick={() => { setEditingId(p.id); setEditingName(p.name); setProductError('') }}
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                      title="名前を変更"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.name)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="削除"
                    >
                      <X size={16} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <input
              type="text"
              value={newProduct}
              onChange={(e) => { setNewProduct(e.target.value); setProductError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()}
              placeholder="新しい回線名"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddProduct}
              disabled={addingProduct || !newProduct.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Plus size={15} />追加
            </button>
          </div>

          {productError && <p className="mt-2 text-xs text-red-600">{productError}</p>}
          {productSuccess && (
            <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              <CheckCircle size={15} /><span className="text-xs font-medium">回線を追加しました</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
