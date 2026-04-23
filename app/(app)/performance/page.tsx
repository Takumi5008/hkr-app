'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react'

type MemberPerformance = {
  id: number
  name: string
  activation_target: number
  cancel_target: number
  work_days_target: number
  period_start: string
  period_end: string
  total_work: number
  total_activation: number
  total_cancel: number
  note: string
  sort_order: number
}

const emptyForm = {
  name: '',
  activationTarget: '',
  cancelTarget: '',
  workDaysTarget: '',
  periodStart: '',
  periodEnd: '',
  totalWork: '',
  totalActivation: '',
  totalCancel: '',
  note: '',
  sortOrder: '0',
}

export default function PerformancePage() {
  const [records, setRecords] = useState<MemberPerformance[]>([])
  const [role, setRole] = useState<string>('member')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/performance').then((r) => r.json()).then(setRecords)
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setRole(d.role ?? 'member'))
  }, [])

  const openAdd = () => {
    setEditId(null)
    setForm({ ...emptyForm })
    setShowForm(true)
  }

  const openEdit = (r: MemberPerformance) => {
    setEditId(r.id)
    setForm({
      name: r.name,
      activationTarget: String(r.activation_target),
      cancelTarget: String(r.cancel_target),
      workDaysTarget: String(r.work_days_target),
      periodStart: r.period_start,
      periodEnd: r.period_end,
      totalWork: String(r.total_work),
      totalActivation: String(r.total_activation),
      totalCancel: String(r.total_cancel),
      note: r.note,
      sortOrder: String(r.sort_order),
    })
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const body = {
      name: form.name.trim(),
      activationTarget: parseInt(form.activationTarget) || 0,
      cancelTarget: parseInt(form.cancelTarget) || 0,
      workDaysTarget: parseInt(form.workDaysTarget) || 0,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      totalWork: parseInt(form.totalWork) || 0,
      totalActivation: parseInt(form.totalActivation) || 0,
      totalCancel: parseInt(form.totalCancel) || 0,
      note: form.note,
      sortOrder: parseInt(form.sortOrder) || 0,
    }
    if (editId !== null) {
      const res = await fetch(`/api/performance/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        setRecords((prev) => prev.map((r) => (r.id === editId ? updated : r)))
      }
    } else {
      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const created = await res.json()
        setRecords((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
      }
    }
    setSaving(false)
    setShowForm(false)
    setEditId(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/performance/${id}`, { method: 'DELETE' })
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const cancelRate = (r: MemberPerformance) => {
    if (r.total_activation === 0) return '-'
    return `${Math.round((r.total_cancel / r.total_activation) * 100)}%`
  }

  const f = (v: string | undefined, key: keyof typeof form) =>
    setForm((prev) => ({ ...prev, [key]: v ?? '' }))

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-violet-600 to-purple-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Performance</p>
        <h1 className="text-2xl font-bold">実績</h1>
        <p className="text-sm text-violet-100 mt-0.5">メンバーの累計実績を管理</p>
      </div>

      {role === 'manager' && (
        <div className="flex justify-end mb-4">
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white text-sm font-semibold rounded-xl hover:bg-violet-600 transition shadow-sm"
          >
            <Plus size={15} />追加
          </button>
        </div>
      )}

      {/* フォーム */}
      {showForm && role === 'manager' && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-violet-100 mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-violet-50 border-b border-violet-100">
            <h2 className="text-sm font-bold text-violet-700">{editId !== null ? '編集' : '新規追加'}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">名前 *</label>
                <input type="text" value={form.name} onChange={(e) => f(e.target.value, 'name')} required
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">開通目標/月</label>
                <input type="number" min={0} value={form.activationTarget} onChange={(e) => f(e.target.value, 'activationTarget')}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">解除目標/月</label>
                <input type="number" min={0} value={form.cancelTarget} onChange={(e) => f(e.target.value, 'cancelTarget')}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">稼働日/月</label>
                <input type="number" min={0} value={form.workDaysTarget} onChange={(e) => f(e.target.value, 'workDaysTarget')}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">期間開始</label>
                <input type="date" value={form.periodStart} onChange={(e) => f(e.target.value, 'periodStart')}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">期間終了</label>
                <input type="date" value={form.periodEnd} onChange={(e) => f(e.target.value, 'periodEnd')}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">総稼働数</label>
                <input type="number" min={0} value={form.totalWork} onChange={(e) => f(e.target.value, 'totalWork')}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">総獲得数</label>
                <input type="number" min={0} value={form.totalActivation} onChange={(e) => f(e.target.value, 'totalActivation')}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">総解除数</label>
                <input type="number" min={0} value={form.totalCancel} onChange={(e) => f(e.target.value, 'totalCancel')}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">表示順</label>
                <input type="number" value={form.sortOrder} onChange={(e) => f(e.target.value, 'sortOrder')}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">備考</label>
                <input type="text" value={form.note} onChange={(e) => f(e.target.value, 'note')}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition">
                キャンセル
              </button>
              <button type="submit" disabled={saving || !form.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-violet-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
                <Save size={14} />{saving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* テーブル */}
      {records.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <p className="text-sm font-medium">実績データがありません</p>
          {role === 'manager' && <p className="text-xs mt-1">「追加」ボタンからメンバーを登録できます</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                <div>
                  <span className="text-base font-bold text-gray-800">{r.name}</span>
                  {(r.period_start || r.period_end) && (
                    <span className="ml-3 text-xs text-gray-400">
                      {r.period_start && r.period_end
                        ? `${r.period_start} 〜 ${r.period_end}`
                        : r.period_start || r.period_end}
                    </span>
                  )}
                </div>
                {role === 'manager' && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(r)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-500 hover:bg-violet-50 transition">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(r.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="px-5 py-4">
                {/* 月次目標 */}
                <div className="flex gap-4 mb-3">
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-400 mb-0.5">開通目標/月</p>
                    <p className="text-lg font-black text-violet-600">{r.activation_target}<span className="text-xs font-normal text-gray-400 ml-0.5">件</span></p>
                  </div>
                  <div className="w-px bg-gray-100" />
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-400 mb-0.5">解除目標/月</p>
                    <p className="text-lg font-black text-violet-600">{r.cancel_target}<span className="text-xs font-normal text-gray-400 ml-0.5">件</span></p>
                  </div>
                  <div className="w-px bg-gray-100" />
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-400 mb-0.5">稼働日/月</p>
                    <p className="text-lg font-black text-violet-600">{r.work_days_target}<span className="text-xs font-normal text-gray-400 ml-0.5">日</span></p>
                  </div>
                </div>
                {/* 累計実績 */}
                <div className="grid grid-cols-4 gap-2 bg-gray-50 rounded-xl p-3">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">総稼働</p>
                    <p className="text-sm font-bold text-gray-700">{r.total_work}<span className="text-xs font-normal text-gray-400">日</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">総獲得</p>
                    <p className="text-sm font-bold text-gray-700">{r.total_activation}<span className="text-xs font-normal text-gray-400">件</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">総解除</p>
                    <p className="text-sm font-bold text-gray-700">{r.total_cancel}<span className="text-xs font-normal text-gray-400">件</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">解除率</p>
                    <p className="text-sm font-bold text-emerald-600">{cancelRate(r)}</p>
                  </div>
                </div>
                {r.note && <p className="text-xs text-gray-400 mt-2">{r.note}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
