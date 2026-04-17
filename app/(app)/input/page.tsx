'use client'

import { useState, useEffect } from 'react'
import { calcHKR, formatMonth } from '@/lib/hkr'
import { CheckCircle, X, Plus, Pencil } from 'lucide-react'

type FormData = { [K: string]: { cancel: string; activation: string } }
type Tab = 'input' | 'products'

export default function InputPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [products, setProducts] = useState<string[]>([])
  const [form, setForm] = useState<FormData>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [role, setRole] = useState<string>('')
  const [tab, setTab] = useState<Tab>('input')

  // 回線管理
  const [productItems, setProductItems] = useState<{ id: number; name: string }[]>([])
  const [newProduct, setNewProduct] = useState('')
  const [productError, setProductError] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)
  const [productSuccess, setProductSuccess] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setRole(d.role))
  }, [])

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data: { id: number; name: string }[]) => {
        setProductItems(data)
        const names = data.map((p) => p.name)
        setProducts(names)
        setForm(Object.fromEntries(names.map((n) => [n, { cancel: '', activation: '' }])))
      })
  }, [])

  useEffect(() => {
    if (products.length === 0) return
    async function load() {
      const res = await fetch(`/api/records?year=${year}&month=${month}`)
      if (!res.ok) return
      const data = await res.json()
      const next: FormData = Object.fromEntries(products.map((n) => [n, { cancel: '', activation: '' }]))
      for (const r of data) {
        if (next[r.product] !== undefined) {
          next[r.product] = { cancel: String(r.cancel_count), activation: String(r.activation_count) }
        }
      }
      setForm(next)
    }
    load()
  }, [year, month, products])

  function handleChange(product: string, field: 'cancel' | 'activation', value: string) {
    if (value !== '' && !/^\d+$/.test(value)) return
    setForm((prev) => ({ ...prev, [product]: { ...prev[product], [field]: value } }))
  }

  async function handleSave() {
    setError('')
    setLoading(true)
    for (const product of products) {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year, month, product,
          cancel_count: parseInt(form[product].cancel || '0', 10),
          activation_count: parseInt(form[product].activation || '0', 10),
        }),
      })
      if (!res.ok) { setError('保存に失敗しました'); setLoading(false); return }
    }
    setSuccess(true)
    setLoading(false)
    setTimeout(() => setSuccess(false), 3000)
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

  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })

  const isManager = role === 'manager'

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-1">Input</p>
        <h1 className="text-2xl font-bold">データ入力</h1>
        <p className="text-sm text-blue-100 mt-0.5">月別・商材別の解除数・開通数を入力</p>
      </div>

      {isManager && (
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setTab('input')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'input' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            データ入力
          </button>
          <button
            onClick={() => setTab('products')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'products' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            回線管理
          </button>
        </div>
      )}

      {/* データ入力タブ */}
      {tab === 'input' && (
        <>
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

          <div className="space-y-4">
            {products.map((product) => {
              const cancel = parseInt(form[product]?.cancel || '0', 10)
              const activation = parseInt(form[product]?.activation || '0', 10)
              const hkr = cancel > 0 ? calcHKR(activation, cancel) : null

              return (
                <div key={product} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{product}</h3>
                    {hkr !== null && (
                      <span className={`text-sm font-bold ${hkr >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                        HKR: {hkr}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
