'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Link2, Copy, Check, Trash2, PackagePlus, X } from 'lucide-react'

type Role = 'member' | 'viewer' | 'manager'

const ROLE_LABELS: Record<Role, string> = {
  member: 'メンバー',
  viewer: '閲覧者（全体）',
  manager: 'マネージャー',
}

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  member: '自分のデータのみ',
  viewer: '全員を閲覧可',
  manager: '全員閲覧・管理可',
}

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([])
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<number | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)

  const [products, setProducts] = useState<any[]>([])
  const [newProduct, setNewProduct] = useState('')
  const [productError, setProductError] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setCurrentUserId(d.id))
    fetch('/api/users').then((r) => r.json()).then(setUsers)
    fetch('/api/products').then((r) => r.json()).then(setProducts)
  }, [])

  async function handleGenerateInvite() {
    setInviteLoading(true)
    const res = await fetch('/api/auth/invite', { method: 'POST' })
    const data = await res.json()
    const url = `${window.location.origin}/register?token=${data.token}`
    setInviteUrl(url)
    setInviteLoading(false)
  }

  async function handleCopyInvite() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 2000)
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
    } else {
      const product = await res.json()
      setProducts((prev) => [...prev, product])
      setNewProduct('')
    }
    setAddingProduct(false)
  }

  async function handleDeleteProduct(name: string) {
    await fetch('/api/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setProducts((prev) => prev.filter((p) => p.name !== name))
  }

  async function handleRoleChange(id: number, role: Role) {
    setSaving(id)
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    })
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u))
    setSaved(id)
    setSaving(null)
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-slate-700 to-slate-600 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Admin</p>
        <h1 className="text-2xl font-bold">管理</h1>
        <p className="text-sm text-slate-300 mt-0.5">メンバーの招待・権限管理</p>
      </div>

      {/* 招待リンク発行 */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Link2 size={16} className="text-blue-600" />
          招待リンクを発行する
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          リンクをSlack・LINEなどでメンバーに共有してください。メンバーが自分で名前・メール・パスワードを登録します。有効期限は7日間・1回限り使用可能です。
        </p>

        <button
          onClick={handleGenerateInvite}
          disabled={inviteLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Link2 size={15} />
          {inviteLoading ? '生成中...' : '招待リンクを生成'}
        </button>

        {inviteUrl && (
          <div className="mt-4">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <span className="text-xs text-gray-600 flex-1 truncate font-mono">{inviteUrl}</span>
              <button
                onClick={handleCopyInvite}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-100 transition-colors shrink-0"
              >
                {copiedInvite ? <><Check size={12} className="text-green-500" />コピー済み</> : <><Copy size={12} />コピー</>}
              </button>
            </div>
            <p className="text-xs text-amber-600 mt-2">※ このリンクは一度だけ使用できます。複数人を招待する場合は都度生成してください。</p>
          </div>
        )}
      </div>

      {/* 商材管理 */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <PackagePlus size={16} className="text-blue-600" />
          取扱商材
        </h3>
        <p className="text-xs text-gray-400 mb-4">データ入力・推移グラフで使用する商材を管理します。</p>

        <ul className="space-y-2 mb-4">
          {products.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-800 font-medium">{p.name}</span>
              <button
                onClick={() => handleDeleteProduct(p.name)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="削除"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <input
            type="text"
            value={newProduct}
            onChange={(e) => { setNewProduct(e.target.value); setProductError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()}
            placeholder="新しい商材名"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddProduct}
            disabled={addingProduct || !newProduct.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            追加
          </button>
        </div>
        {productError && <p className="mt-2 text-xs text-red-600">{productError}</p>}
      </div>

      {/* メンバー一覧 */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-xs text-gray-500">{users.length}人のメンバー</p>
        </div>
        <ul className="divide-y divide-gray-100">
          {users.map((user) => (
            <li key={user.id} className="flex items-center gap-4 px-4 py-4">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-400">{user.email} · {ROLE_DESCRIPTIONS[user.role as Role]}</p>
              </div>
              <div className="flex items-center gap-2">
                {saved === user.id && <CheckCircle size={16} className="text-green-500" />}
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                  disabled={saving === user.id || user.id === currentUserId}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([r, l]) => (
                    <option key={r} value={r}>{l}</option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-400">※ 自分自身のロールは変更できません</p>
        </div>
      </div>
    </div>
  )
}
