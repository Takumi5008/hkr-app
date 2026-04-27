'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Plus, Trash2, Gift, Clock, Check, X } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'

type Tab = 'items' | 'history'

interface Item { id: number; name: string; description: string; cost: number }
interface Exchange { id: number; item_name: string; cost: number; status: string; created_at: string; user_name?: string; user_avatar?: string }
interface HistoryRow { year: number; month: number; activation: number; points_earned: number }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:  { label: '処理中', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '承認済', color: 'bg-green-100 text-green-700' },
  rejected: { label: '却下',   color: 'bg-red-100 text-red-700' },
}

export default function ExchangePage() {
  const [tab, setTab] = useState<Tab>('items')
  const [role, setRole] = useState('')
  const [myPoints, setMyPoints] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [history, setHistory] = useState<HistoryRow[]>([])

  // 新規アイテム追加（管理者）
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCost, setNewCost] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const [exchangeMsg, setExchangeMsg] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { setRole(d.role); setMyPoints(d.points ?? 0) })
    fetch('/api/points/items').then(r => r.json()).then(d => { if (Array.isArray(d)) setItems(d) })
    fetch('/api/points/exchanges').then(r => r.json()).then(d => { if (Array.isArray(d)) setExchanges(d) })
    fetch('/api/points/history').then(r => r.json()).then(d => { if (Array.isArray(d)) setHistory(d) })
  }, [])

  const isManager = role === 'manager' || role === 'viewer'

  async function handleExchange(item: Item) {
    if (myPoints < item.cost) { setExchangeMsg('ポイントが不足しています'); return }
    if (!confirm(`「${item.name}」を ${item.cost}pt で交換しますか？`)) return
    const res = await fetch('/api/points/exchanges', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id }),
    })
    const data = await res.json()
    if (!res.ok) { setExchangeMsg(data.error); return }
    setMyPoints(data.newPoints)
    fetch('/api/points/exchanges').then(r => r.json()).then(d => { if (Array.isArray(d)) setExchanges(d) })
    setExchangeMsg(`「${item.name}」と交換しました！`)
    setTimeout(() => setExchangeMsg(''), 3000)
  }

  async function handleAddItem() {
    setAddError('')
    if (!newName.trim() || !newCost) { setAddError('名前とポイントは必須です'); return }
    setAddLoading(true)
    const res = await fetch('/api/points/items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), cost: Number(newCost) }),
    })
    const data = await res.json()
    if (!res.ok) { setAddError(data.error); setAddLoading(false); return }
    setItems(data); setNewName(''); setNewDesc(''); setNewCost('')
    setAddLoading(false)
  }

  async function handleDeleteItem(id: number) {
    if (!confirm('このアイテムを非表示にしますか？')) return
    await fetch('/api/points/items', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleUpdateStatus(id: number, status: 'approved' | 'rejected') {
    await fetch('/api/points/exchanges', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setExchanges(prev => prev.map(e => e.id === id ? { ...e, status } : e))
    if (status === 'rejected') {
      fetch('/api/auth/me').then(r => r.json()).then(d => setMyPoints(d.points ?? 0))
    }
  }

  const myExchanges = isManager ? [] : exchanges
  const allExchanges = isManager ? exchanges : []
  const pendingCount = allExchanges.filter(e => e.status === 'pending').length

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-rose-200 mb-1">Exchange</p>
        <h1 className="text-2xl font-bold">ポイント交換</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-rose-200 text-sm">保有ポイント</span>
          <span className="text-2xl font-black">⭐ {myPoints.toLocaleString()}pt</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setTab('items')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'items' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          🎁 交換一覧
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors relative ${tab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          📋 ポイント履歴
          {isManager && pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{pendingCount}</span>
          )}
        </button>
      </div>

      {/* ── 交換一覧タブ ── */}
      {tab === 'items' && (
        <>
          {exchangeMsg && (
            <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${exchangeMsg.includes('不足') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              <CheckCircle size={16} />{exchangeMsg}
            </div>
          )}

          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              交換できるアイテムがまだありません
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {items.map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center shrink-0">
                    <Gift size={22} className="text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                    {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                    <p className="text-base font-black text-amber-600 mt-1">⭐ {item.cost.toLocaleString()}pt</p>
                  </div>
                  {isManager ? (
                    <button onClick={() => handleDeleteItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleExchange(item)}
                      disabled={myPoints < item.cost}
                      className="shrink-0 px-4 py-2 bg-rose-500 text-white text-sm font-bold rounded-xl hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      交換
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 管理者: アイテム追加 */}
          {isManager && (
            <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Plus size={15} />アイテムを追加</h2>
              <div className="space-y-3">
                <input type="text" placeholder="アイテム名（例：早退権）" value={newName}
                  onChange={e => { setNewName(e.target.value); setAddError('') }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                <input type="text" placeholder="説明（任意）" value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                <input type="number" placeholder="必要ポイント" value={newCost} min={1}
                  onChange={e => { setNewCost(e.target.value); setAddError('') }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                {addError && <p className="text-xs text-red-600">{addError}</p>}
                <button onClick={handleAddItem} disabled={addLoading}
                  className="w-full py-2.5 bg-rose-500 text-white text-sm font-bold rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-colors">
                  {addLoading ? '追加中...' : '追加する'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ポイント履歴タブ ── */}
      {tab === 'history' && (
        <div className="space-y-6">

          {/* 管理者: 全交換リクエスト */}
          {isManager && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                📬 交換リクエスト
                {pendingCount > 0 && <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{pendingCount}件 処理待ち</span>}
              </h2>
              {allExchanges.length === 0 ? (
                <p className="text-sm text-gray-400">リクエストはありません</p>
              ) : (
                <div className="space-y-2">
                  {allExchanges.map(e => (
                    <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                      <UserAvatar name={e.user_name ?? '?'} avatar={e.user_avatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{e.user_name}</p>
                        <p className="text-xs text-gray-500">{e.item_name} · <span className="font-bold text-amber-600">⭐{e.cost}pt</span></p>
                      </div>
                      {e.status === 'pending' ? (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleUpdateStatus(e.id, 'approved')}
                            className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
                            <Check size={14} />
                          </button>
                          <button onClick={() => handleUpdateStatus(e.id, 'rejected')}
                            className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_LABEL[e.status].color}`}>
                          {STATUS_LABEL[e.status].label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 自分の交換履歴（メンバー） */}
          {!isManager && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Gift size={15} />交換履歴</h2>
              {myExchanges.length === 0 ? (
                <p className="text-sm text-gray-400">まだ交換履歴がありません</p>
              ) : (
                <div className="space-y-2">
                  {myExchanges.map(e => (
                    <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                      <Gift size={16} className="text-rose-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{e.item_name}</p>
                        <p className="text-xs text-gray-400">{e.created_at.slice(0, 10)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-rose-500">−{e.cost.toLocaleString()}pt</p>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_LABEL[e.status].color}`}>
                          {STATUS_LABEL[e.status].label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ポイント付加一覧 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">⭐ ポイント付加履歴</h2>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">まだポイント履歴がありません</p>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={`${h.year}-${h.month}`} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{h.year}年{h.month}月</p>
                      <p className="text-xs text-gray-500">開通 {h.activation}件</p>
                    </div>
                    <p className="text-base font-black text-amber-600">+{h.points_earned.toLocaleString()}pt</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
