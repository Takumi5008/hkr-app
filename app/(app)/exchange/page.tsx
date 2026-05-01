'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Plus, Trash2, Gift, Check, X, Pencil, Save } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'
import { useConfirm } from '@/components/useConfirm'

type Tab = 'items' | 'gacha' | 'level' | 'rules'

interface Item { id: number; name: string; description: string; cost: number }
interface Exchange { id: number; item_name: string; cost: number; status: string; created_at: string; user_name?: string; user_avatar?: string }
interface Rule { id: number; action: string; points: number }
interface RankUser { id: number; name: string; avatar: string | null; points: number; level: number }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:  { label: '処理中', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '承認済', color: 'bg-green-100 text-green-700' },
  rejected: { label: '却下',   color: 'bg-red-100 text-red-700' },
}

export default function ExchangePage() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [tab, setTab] = useState<Tab>('items')
  const [role, setRole] = useState('')
  const [myPoints, setMyPoints] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [rules, setRules] = useState<Rule[]>([])

  // アイテム追加フォーム
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCost, setNewCost] = useState('')
  const [addItemError, setAddItemError] = useState('')
  const [addItemLoading, setAddItemLoading] = useState(false)

  // ルール追加フォーム
  const [newAction, setNewAction] = useState('')
  const [newPoints, setNewPoints] = useState('')
  const [addRuleError, setAddRuleError] = useState('')
  const [addRuleLoading, setAddRuleLoading] = useState(false)

  // ルール編集
  const [editRuleId, setEditRuleId] = useState<number | null>(null)
  const [editRuleAction, setEditRuleAction] = useState('')
  const [editRulePoints, setEditRulePoints] = useState('')

  const [exchangeMsg, setExchangeMsg] = useState('')
  const [ranking, setRanking] = useState<RankUser[]>([])
  const [myLevel, setMyLevel] = useState(0)
  const [levelHistory, setLevelHistory] = useState<any[]>([])
  const [levelUpLoading, setLevelUpLoading] = useState(false)
  const [levelUpMsg, setLevelUpMsg] = useState<{ msg: string; ok: boolean } | null>(null)

  // ガチャ
  const [gachaItems, setGachaItems] = useState<any[]>([])
  const [gachaCost, setGachaCost] = useState(200)
  const [gachaPulling, setGachaPulling] = useState(false)
  const [gachaResult, setGachaResult] = useState<any | null>(null)
  const [gachaError, setGachaError] = useState('')
  // ガチャ管理フォーム（マネージャー）
  const [gachaName, setGachaName] = useState('')
  const [gachaDesc, setGachaDesc] = useState('')
  const [gachaRarity, setGachaRarity] = useState('common')
  const [gachaWeight, setGachaWeight] = useState('10')
  const [gachaAddError, setGachaAddError] = useState('')
  const [gachaAddLoading, setGachaAddLoading] = useState(false)

  // 手動ポイント付与フォーム
  const [grantUserId, setGrantUserId] = useState('')
  const [grantDelta, setGrantDelta] = useState('')
  const [grantReason, setGrantReason] = useState('')
  const [grantMsg, setGrantMsg] = useState('')
  const [grantLoading, setGrantLoading] = useState(false)

  async function fetchLevelHistory() {
    const res = await fetch('/api/points/levelup')
    const data = await res.json()
    if (Array.isArray(data)) setLevelHistory(data)
  }

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { setRole(d.role); setMyPoints(d.points ?? 0); setMyLevel(d.level ?? 0) })
    fetchLevelHistory()
    fetch('/api/points/items').then(r => r.json()).then(d => { if (Array.isArray(d)) setItems(d) })
    fetch('/api/points/exchanges').then(r => r.json()).then(d => { if (Array.isArray(d)) setExchanges(d) })
    fetch('/api/points/rules').then(r => r.json()).then(d => { if (Array.isArray(d)) setRules(d) })
    fetch('/api/points/ranking').then(r => r.json()).then(d => { if (Array.isArray(d)) setRanking(d) })
    fetch('/api/gacha').then(r => r.json()).then(d => { if (d.items) { setGachaItems(d.items); setGachaCost(d.cost) } })
  }, [])

  const isManager = role === 'manager' || role === 'viewer'
  const pendingCount = isManager ? exchanges.filter(e => e.status === 'pending').length : 0

  async function handleExchange(item: Item) {
    if (myPoints < item.cost) { setExchangeMsg('ポイントが不足しています'); return }
    if (!await confirm(`「${item.name}」を ${item.cost}pt で交換しますか？`)) return
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
    setAddItemError('')
    if (!newName.trim() || !newCost) { setAddItemError('名前とポイントは必須です'); return }
    setAddItemLoading(true)
    const res = await fetch('/api/points/items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), cost: Number(newCost) }),
    })
    const data = await res.json()
    if (!res.ok) { setAddItemError(data.error); setAddItemLoading(false); return }
    setItems(data); setNewName(''); setNewDesc(''); setNewCost('')
    setAddItemLoading(false)
  }

  async function handleDeleteItem(id: number) {
    if (!await confirm('このアイテムを非表示にしますか？')) return
    await fetch('/api/points/items', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function handleAddRule() {
    setAddRuleError('')
    if (!newAction.trim() || !newPoints) { setAddRuleError('内容とポイントは必須です'); return }
    setAddRuleLoading(true)
    const res = await fetch('/api/points/rules', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: newAction.trim(), points: Number(newPoints) }),
    })
    const data = await res.json()
    if (!res.ok) { setAddRuleError(data.error); setAddRuleLoading(false); return }
    setRules(data); setNewAction(''); setNewPoints('')
    setAddRuleLoading(false)
  }

  async function handleDeleteRule(id: number) {
    if (!await confirm('このルールを削除しますか？')) return
    await fetch('/api/points/rules', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setRules(prev => prev.filter(r => r.id !== id))
  }

  function startEditRule(r: Rule) {
    setEditRuleId(r.id)
    setEditRuleAction(r.action)
    setEditRulePoints(String(r.points))
  }

  async function handleSaveRule() {
    if (!editRuleId || !editRuleAction.trim() || !editRulePoints || Number(editRulePoints) === 0) return
    const res = await fetch('/api/points/rules', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editRuleId, action: editRuleAction.trim(), points: Number(editRulePoints) }),
    })
    const data = await res.json()
    if (Array.isArray(data)) setRules(data)
    setEditRuleId(null)
  }

  async function handleGrant() {
    if (!grantUserId || !grantDelta || Number(grantDelta) === 0) { setGrantMsg('メンバーとポイントを入力してください'); return }
    setGrantLoading(true)
    const res = await fetch('/api/points/grant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: Number(grantUserId), delta: Number(grantDelta), reason: grantReason || '管理者による付与' }),
    })
    if (!res.ok) { const d = await res.json(); setGrantMsg(d.error); setGrantLoading(false); return }
    setGrantMsg(`付与しました！`)
    setGrantDelta(''); setGrantReason('')
    fetch('/api/points/ranking').then(r => r.json()).then(d => { if (Array.isArray(d)) setRanking(d) })
    setTimeout(() => setGrantMsg(''), 3000)
    setGrantLoading(false)
  }

  async function handleLevelUp() {
    setLevelUpLoading(true)
    setLevelUpMsg(null)
    const res = await fetch('/api/points/levelup', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setLevelUpMsg({ msg: data.error, ok: false })
    } else {
      setMyPoints(data.points)
      setMyLevel(data.level)
      setLevelUpMsg({ msg: `Lv.${data.level} にレベルアップしました！`, ok: true })
      fetchLevelHistory()
    }
    setLevelUpLoading(false)
    setTimeout(() => setLevelUpMsg(null), 3000)
  }

  async function handleGachaPull() {
    setGachaPulling(true); setGachaResult(null); setGachaError('')
    const res = await fetch('/api/gacha', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setGachaError(data.error); setGachaPulling(false); return }
    setGachaResult(data)
    setMyPoints(data.newPoints)
    setGachaPulling(false)
  }

  async function handleAddGachaItem() {
    setGachaAddError('')
    if (!gachaName.trim()) { setGachaAddError('名前は必須です'); return }
    setGachaAddLoading(true)
    const res = await fetch('/api/points/items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: gachaName.trim(), description: gachaDesc.trim(), cost: 1, isGacha: true, gachaRarity, gachaWeight: Number(gachaWeight) }),
    })
    const data = await res.json()
    if (!res.ok) { setGachaAddError(data.error); setGachaAddLoading(false); return }
    fetch('/api/gacha').then(r => r.json()).then(d => { if (d.items) setGachaItems(d.items) })
    setGachaName(''); setGachaDesc(''); setGachaRarity('common'); setGachaWeight('10')
    setGachaAddLoading(false)
  }

  async function handleUpdateStatus(id: number, status: 'approved' | 'rejected') {
    await fetch('/api/points/exchanges', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setExchanges(prev => prev.map(e => e.id === id ? { ...e, status } : e))
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      {ConfirmDialog}
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
        <button onClick={() => setTab('items')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors relative ${tab === 'items' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          🎁 交換一覧
          {isManager && pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{pendingCount}</span>
          )}
        </button>
        <button onClick={() => setTab('gacha')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'gacha' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          🎰 ガチャ
        </button>
        <button onClick={() => setTab('level')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'level' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          ⬆️ レベル
        </button>
        <button onClick={() => setTab('rules')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'rules' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          ⭐ ルール
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

          {/* アイテム一覧 */}
          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm mb-4">
              交換できるアイテムがまだありません
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 mb-4">
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
            <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
              <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Plus size={15} />アイテムを追加</h2>
              <div className="space-y-3">
                <input type="text" placeholder="アイテム名（例：早退権）" value={newName}
                  onChange={e => { setNewName(e.target.value); setAddItemError('') }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                <input type="text" placeholder="説明（任意）" value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                <input type="number" placeholder="必要ポイント" value={newCost} min={1}
                  onChange={e => { setNewCost(e.target.value); setAddItemError('') }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
                {addItemError && <p className="text-xs text-red-600">{addItemError}</p>}
                <button onClick={handleAddItem} disabled={addItemLoading}
                  className="w-full py-2.5 bg-rose-500 text-white text-sm font-bold rounded-xl hover:bg-rose-600 disabled:opacity-50 transition-colors">
                  {addItemLoading ? '追加中...' : '追加する'}
                </button>
              </div>
            </div>
          )}

          {/* 管理者: 交換リクエスト */}
          {isManager && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                📬 交換リクエスト
                {pendingCount > 0 && <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{pendingCount}件 処理待ち</span>}
              </h2>
              {exchanges.length === 0 ? (
                <p className="text-sm text-gray-400">リクエストはありません</p>
              ) : (
                <div className="space-y-2">
                  {exchanges.map(e => (
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

          {/* メンバー: 交換履歴 */}
          {!isManager && (
            <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Gift size={15} />交換履歴</h2>
              {exchanges.length === 0 ? (
                <p className="text-sm text-gray-400">まだ交換履歴がありません</p>
              ) : (
                <div className="space-y-2">
                  {exchanges.map(e => (
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
          {/* 手動ポイント付与（マネージャーのみ） */}
          {isManager && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Plus size={15} />ポイントを手動付与</h2>
              <div className="space-y-2">
                <select value={grantUserId} onChange={e => setGrantUserId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  <option value="">メンバーを選択</option>
                  {ranking.map(u => (
                    <option key={u.id} value={u.id}>{u.name}（現在 {u.points}pt）</option>
                  ))}
                </select>
                <input type="number" placeholder="ポイント（マイナス可）" value={grantDelta}
                  onChange={e => setGrantDelta(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                <input type="text" placeholder="理由（例：5月シフト提出）" value={grantReason}
                  onChange={e => setGrantReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                {grantMsg && <p className={`text-xs font-medium ${grantMsg.includes('付与') ? 'text-green-600' : 'text-red-600'}`}>{grantMsg}</p>}
                <button onClick={handleGrant} disabled={grantLoading}
                  className="w-full py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors">
                  {grantLoading ? '処理中...' : '付与する'}
                </button>
              </div>
            </div>
          )}

          {/* レベルランキング（マネージャーのみ） */}
          {isManager && ranking.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                🏆 レベルランキング
              </h2>
              <div className="space-y-2">
                {ranking.map((u, i) => {
                  const maxLevel = Math.max(ranking[0].level, 1)
                  const nextLevelCost = 100 * (u.level + 1)
                  const medals = ['🥇', '🥈', '🥉']
                  return (
                    <div key={u.id} className="flex items-center gap-3">
                      <span className="text-base w-6 text-center shrink-0">
                        {i < 3 ? medals[i] : <span className="text-xs text-gray-400 font-bold">{i + 1}</span>}
                      </span>
                      <UserAvatar name={u.name} avatar={u.avatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-medium text-gray-800 truncate">{u.name}</span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-xs font-bold text-amber-600">{u.points.toLocaleString()}pt</span>
                            <span className="text-sm font-black text-violet-600">Lv.{u.level}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-400 to-indigo-400 rounded-full"
                            style={{ width: `${Math.max(0, Math.round((u.level / maxLevel) * 100))}%` }}
                          />
                        </div>
                        {u.level < 100 && (
                          <p className="text-[10px] text-gray-400 mt-0.5">次のLv.{u.level + 1}まで {nextLevelCost - u.points}pt</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── レベルタブ ── */}
      {tab === 'level' && (
        <div className="space-y-4">
          {/* 現在のレベルカード */}
          <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl p-6 text-white">
            <div className="text-center mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Level</p>
              <div className="text-7xl font-black mb-1">{myLevel}</div>
              <p className="text-violet-200 text-sm">現在のレベル</p>
            </div>

            {myLevel < 100 ? (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-violet-200">Lv.{myLevel + 1}まであと</span>
                    <span className="font-bold">{Math.max(0, 100 * (myLevel + 1) - myPoints).toLocaleString()}pt</span>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((myPoints / (100 * (myLevel + 1))) * 100))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-violet-200 mt-1">
                    <span>現在: {myPoints.toLocaleString()}pt</span>
                    <span>必要: {(100 * (myLevel + 1)).toLocaleString()}pt</span>
                  </div>
                </div>

                {levelUpMsg && (
                  <p className={`text-sm font-bold text-center mb-3 ${levelUpMsg.ok ? 'text-green-300' : 'text-red-300'}`}>
                    {levelUpMsg.msg}
                  </p>
                )}

                <button
                  onClick={handleLevelUp}
                  disabled={levelUpLoading || myPoints < 100 * (myLevel + 1)}
                  className="w-full py-3 bg-white text-violet-700 font-black text-sm rounded-xl hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg"
                >
                  {levelUpLoading ? 'レベルアップ中...' : `⬆️ Lv.${myLevel + 1}にレベルアップ（${(100 * (myLevel + 1)).toLocaleString()}pt）`}
                </button>
                {myPoints < 100 * (myLevel + 1) && (
                  <p className="text-xs text-violet-300 text-center mt-2">
                    あと {(100 * (myLevel + 1) - myPoints).toLocaleString()}pt 貯めると昇格できます
                  </p>
                )}
              </>
            ) : (
              <div className="text-center mt-2">
                <p className="text-2xl font-black text-yellow-300">🏆 MAX LEVEL!</p>
                <p className="text-violet-200 text-sm mt-1">おめでとうございます！</p>
              </div>
            )}
          </div>

          {/* レベルアップ履歴 */}
          {levelHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-3">⬆️ レベルアップ履歴</h2>
              <div className="space-y-2">
                {levelHistory.map((h: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl">
                    <span className="text-violet-500 text-base shrink-0">⬆️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{h.reason}</p>
                      <p className="text-xs text-gray-400">{h.created_at.slice(0, 10)}</p>
                    </div>
                    <span className="text-sm font-bold text-violet-600 shrink-0">{Math.abs(h.delta).toLocaleString()}pt</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* レベルアップ費用表 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-3">💡 レベルアップ費用</h2>
            <p className="text-xs text-gray-500 mb-3">費用 = <span className="font-bold text-violet-600">100 × 次のレベル pt</span></p>
            <div className="grid grid-cols-2 gap-1">
              {[1,2,3,4,5,10,20,50,100].map(lv => (
                <div key={lv} className={`flex justify-between items-center px-3 py-1.5 rounded-lg text-xs ${lv === myLevel + 1 ? 'bg-violet-50 font-bold text-violet-700' : 'bg-gray-50 text-gray-600'}`}>
                  <span>Lv.{lv - 1} → {lv}</span>
                  <span className="font-bold">{(100 * lv).toLocaleString()}pt</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ガチャタブ ── */}
      {tab === 'gacha' && (
        <div className="space-y-4">
          {/* ガチャ引くUI */}
          <div className="bg-gradient-to-br from-fuchsia-600 to-purple-700 rounded-2xl p-6 text-white text-center">
            <div className="text-5xl mb-3">🎰</div>
            <h2 className="text-xl font-black mb-1">ガチャ</h2>
            <p className="text-sm opacity-80 mb-4">1回 {gachaCost}pt で引ける！</p>
            {gachaError && <p className="text-red-200 text-sm mb-3 font-medium">{gachaError}</p>}
            {gachaResult && !gachaPulling && (
              <div className="mb-4 bg-white/20 rounded-xl p-4">
                <p className="text-xs font-bold opacity-70 mb-1">当選！</p>
                <div className="text-4xl mb-1">🎉</div>
                <p className={`text-xs font-black px-2 py-0.5 rounded-full inline-block mb-1 ${gachaResult.rarityColor}`}>{gachaResult.rarityLabel}</p>
                <p className="text-lg font-black">{gachaResult.item?.name}</p>
                {gachaResult.item?.description && <p className="text-xs opacity-70 mt-0.5">{gachaResult.item.description}</p>}
                <p className="text-xs opacity-60 mt-2">管理者が確認後に付与されます</p>
              </div>
            )}
            {gachaPulling && (
              <div className="mb-4 py-6">
                <div className="text-6xl animate-spin inline-block">🎰</div>
              </div>
            )}
            <button onClick={handleGachaPull} disabled={gachaPulling || myPoints < gachaCost}
              className="w-full py-3 bg-white text-fuchsia-700 font-black text-base rounded-xl hover:bg-fuchsia-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg">
              {gachaPulling ? '抽選中...' : `🎰 ガチャを引く（${gachaCost}pt）`}
            </button>
            {myPoints < gachaCost && <p className="text-xs text-red-200 mt-2">ポイントが不足しています（現在 {myPoints}pt）</p>}
          </div>

          {/* ガチャアイテム一覧 */}
          {gachaItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h2 className="text-sm font-bold text-gray-700 mb-3">排出アイテム</h2>
              <div className="space-y-2">
                {gachaItems.map((item: any) => {
                  const rarityColor: Record<string, string> = { common: 'bg-gray-100 text-gray-600', rare: 'bg-blue-100 text-blue-600', epic: 'bg-purple-100 text-purple-600', legendary: 'bg-yellow-100 text-yellow-600' }
                  const rarityLabel: Record<string, string> = { common: 'コモン', rare: 'レア', epic: 'エピック', legendary: 'レジェンダリー' }
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${rarityColor[item.gacha_rarity] ?? rarityColor.common}`}>
                        {rarityLabel[item.gacha_rarity] ?? 'コモン'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 管理者: ガチャアイテム追加 */}
          {isManager && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Plus size={15} />ガチャアイテムを追加</h2>
              <div className="space-y-3">
                <input type="text" placeholder="アイテム名（例：コーヒー券）" value={gachaName}
                  onChange={e => { setGachaName(e.target.value); setGachaAddError('') }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
                <input type="text" placeholder="説明（任意）" value={gachaDesc}
                  onChange={e => setGachaDesc(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
                <select value={gachaRarity} onChange={e => setGachaRarity(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400">
                  <option value="common">コモン（高確率）</option>
                  <option value="rare">レア（中確率）</option>
                  <option value="epic">エピック（低確率）</option>
                  <option value="legendary">レジェンダリー（超低確率）</option>
                </select>
                <input type="number" placeholder="排出重み（コモン:10 レア:5 エピック:2 レジェ:1）" value={gachaWeight} min={1}
                  onChange={e => setGachaWeight(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400" />
                {gachaAddError && <p className="text-xs text-red-600">{gachaAddError}</p>}
                <button onClick={handleAddGachaItem} disabled={gachaAddLoading}
                  className="w-full py-2.5 bg-fuchsia-500 text-white text-sm font-bold rounded-xl hover:bg-fuchsia-600 disabled:opacity-50 transition-colors">
                  {gachaAddLoading ? '追加中...' : '追加する'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ポイント付加一覧タブ ── */}
      {tab === 'rules' && (
        <div className="space-y-4">
          {rules.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              ポイント付加ルールがまだ設定されていません
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {rules.map((r, i) => (
                <div key={r.id} className={`px-4 py-3 ${i !== rules.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  {isManager && editRuleId === r.id ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={editRuleAction} onChange={e => setEditRuleAction(e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      <input type="number" value={editRulePoints} onChange={e => setEditRulePoints(e.target.value)}
                        className="w-24 px-2 py-1.5 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      <button onClick={handleSaveRule} className="text-amber-500 hover:text-amber-700 transition-colors shrink-0"><Save size={15} /></button>
                      <button onClick={() => setEditRuleId(null)} className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"><X size={15} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{r.action}</p>
                      </div>
                      <p className={`text-base font-black shrink-0 ${r.points < 0 ? 'text-red-500' : 'text-amber-600'}`}>{r.points > 0 ? '+' : ''}{r.points.toLocaleString()}pt</p>
                      {isManager && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => startEditRule(r)} className="text-gray-300 hover:text-amber-400 transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteRule(r.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 管理者: ルール追加 */}
          {isManager && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Plus size={15} />ルールを追加</h2>
              <div className="space-y-3">
                <input type="text" placeholder="内容（例：開通1件につき）" value={newAction}
                  onChange={e => { setNewAction(e.target.value); setAddRuleError('') }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                <input type="number" placeholder="ポイント（マイナス可）" value={newPoints}
                  onChange={e => { setNewPoints(e.target.value); setAddRuleError('') }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                {addRuleError && <p className="text-xs text-red-600">{addRuleError}</p>}
                <button onClick={handleAddRule} disabled={addRuleLoading}
                  className="w-full py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors">
                  {addRuleLoading ? '追加中...' : '追加する'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
