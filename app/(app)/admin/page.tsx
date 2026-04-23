'use client'

import { useState, useEffect, Fragment } from 'react'
import { CheckCircle, Link2, Copy, Check, Trash2, PackagePlus, X, Users, Calendar, ClipboardList, ChevronLeft, ChevronRight, BarChart2, TrendingDown, TrendingUp, Minus } from 'lucide-react'

type Role = 'member' | 'viewer' | 'manager'
const ROLE_LABELS: Record<Role, string> = { member: 'メンバー', viewer: '閲覧者（全体）', manager: 'マネージャー' }
const ROLE_DESCRIPTIONS: Record<Role, string> = { member: '自分のデータのみ', viewer: '全員を閲覧可', manager: '全員閲覧・管理可' }

const getWorkType = (workDates: any[], day: number) => {
  if (!workDates || workDates.length === 0) return null
  if (typeof workDates[0] === 'number') return workDates.includes(day) ? 'full' : null
  const entry = workDates.find((w: any) => w.day === day)
  return entry ? entry.type : null
}

const WorkCell = ({ type }: { type: string | null }) => {
  if (!type) return <span className="text-gray-200">·</span>
  if (type === 'full') return <span className="text-indigo-600 font-bold text-sm">●</span>
  if (type === 'am') return <span className="text-sky-500 font-bold text-xs">前</span>
  if (type === 'pm') return <span className="text-amber-500 font-bold text-xs">後</span>
  return null
}

export default function AdminPage() {
  const [adminTab, setAdminTab] = useState<'users' | 'shifts' | 'mtg' | 'progress'>('users')

  // Users & Products
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

  // Shifts
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [shifts, setShifts] = useState<any[]>([])
  const [shiftsLoading, setShiftsLoading] = useState(false)
  const [deadlineAt, setDeadlineAt] = useState('')
  const [deadlineSaved, setDeadlineSaved] = useState(false)

  // Progress
  const [progressYear, setProgressYear] = useState(today.getFullYear())
  const [progressMonth, setProgressMonth] = useState(today.getMonth() + 1)
  const [progressData, setProgressData] = useState<any[]>([])

  // MTG
  const [mtgData, setMtgData] = useState<{ dates: string[]; members: any[]; map: Record<number, Record<string, any>> } | null>(null)
  const [mtgYear, setMtgYear] = useState(today.getFullYear())
  const [mtgMonth, setMtgMonth] = useState(today.getMonth() + 1)
  const [mtgDeadlineAt, setMtgDeadlineAt] = useState('')
  const [mtgDeadlineSaved, setMtgDeadlineSaved] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setCurrentUserId(d.id))
    fetch('/api/users').then((r) => r.json()).then(setUsers)
    fetch('/api/products').then((r) => r.json()).then(setProducts)
  }, [])

  useEffect(() => {
    if (adminTab !== 'shifts') return
    setShiftsLoading(true)
    Promise.all([
      fetch(`/api/shifts/all?year=${year}&month=${month}`).then((r) => r.json()),
      fetch(`/api/deadlines?year=${year}&month=${month}`).then((r) => r.json()),
    ]).then(([s, dl]) => {
      setShifts(s)
      setDeadlineAt(dl.deadlineAt ?? '')
      setShiftsLoading(false)
    })
  }, [adminTab, year, month])

  useEffect(() => {
    if (adminTab !== 'progress') return
    fetch(`/api/progress/all?year=${progressYear}&month=${progressMonth}`)
      .then((r) => r.json())
      .then(setProgressData)
  }, [adminTab, progressYear, progressMonth])

  useEffect(() => {
    if (adminTab !== 'mtg') return
    setMtgData(null)
    Promise.all([
      fetch(`/api/mtg/all?year=${mtgYear}&month=${mtgMonth}`).then((r) => r.json()),
      fetch(`/api/mtg/deadlines?year=${mtgYear}&month=${mtgMonth}`).then((r) => r.json()),
    ]).then(([data, dl]) => {
      setMtgData(data)
      setMtgDeadlineAt(dl.deadlineAt ?? '')
    })
  }, [adminTab, mtgYear, mtgMonth])

  const prevMonth = () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) }
  const prevMtgMonth = () => { if (mtgMonth === 1) { setMtgYear((y) => y - 1); setMtgMonth(12) } else setMtgMonth((m) => m - 1) }
  const nextMtgMonth = () => { if (mtgMonth === 12) { setMtgYear((y) => y + 1); setMtgMonth(1) } else setMtgMonth((m) => m + 1) }
  const prevProgressMonth = () => { if (progressMonth === 1) { setProgressYear((y) => y - 1); setProgressMonth(12) } else setProgressMonth((m) => m - 1) }
  const nextProgressMonth = () => { if (progressMonth === 12) { setProgressYear((y) => y + 1); setProgressMonth(1) } else setProgressMonth((m) => m + 1) }

  async function handleSaveDeadline() {
    if (!deadlineAt) return
    await fetch('/api/deadlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, deadlineAt }),
    })
    setDeadlineSaved(true)
    setTimeout(() => setDeadlineSaved(false), 2000)
  }

  async function handleDeleteDeadline() {
    await fetch('/api/deadlines', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month }),
    })
    setDeadlineAt('')
  }

  async function handleSaveMtgDeadline() {
    if (!mtgDeadlineAt) return
    await fetch('/api/mtg/deadlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: mtgYear, month: mtgMonth, deadlineAt: mtgDeadlineAt }),
    })
    setMtgDeadlineSaved(true)
    setTimeout(() => setMtgDeadlineSaved(false), 2000)
  }

  async function handleDeleteMtgDeadline() {
    await fetch('/api/mtg/deadlines', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: mtgYear, month: mtgMonth }),
    })
    setMtgDeadlineAt('')
  }

  async function handleGenerateInvite() {
    setInviteLoading(true)
    const res = await fetch('/api/auth/invite', { method: 'POST' })
    const data = await res.json()
    setInviteUrl(`${window.location.origin}/register?token=${data.token}`)
    setInviteLoading(false)
  }

  async function handleCopyInvite() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopiedInvite(true)
    setTimeout(() => setCopiedInvite(false), 2000)
  }

  async function handleAddProduct() {
    if (!newProduct.trim()) return
    setProductError(''); setAddingProduct(true)
    const res = await fetch('/api/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProduct.trim() }),
    })
    if (!res.ok) { const d = await res.json(); setProductError(d.error ?? '追加に失敗しました') }
    else { const p = await res.json(); setProducts((prev) => [...prev, p]); setNewProduct('') }
    setAddingProduct(false)
  }

  async function handleDeleteProduct(name: string) {
    await fetch('/api/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    setProducts((prev) => prev.filter((p) => p.name !== name))
  }

  async function handleRoleChange(id: number, role: Role) {
    setSaving(id)
    await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, role }) })
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u))
    setSaved(id); setSaving(null)
    setTimeout(() => setSaved(null), 2000)
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const memberTotal = (member: any) => days.filter((d) => getWorkType(member.workDates, d)).length
  const dayTotal = (d: number) => shifts.filter((m) => getWorkType(m.workDates, d)).length
  const grandTotal = shifts.reduce((sum, m) => sum + memberTotal(m), 0)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
    return `${d.getMonth() + 1}/${d.getDate()}（${dow}）`
  }

  const statusLabel = (s: string) => s === 'present' ? { text: '出席', cls: 'text-emerald-600 bg-emerald-50' } : s === 'late' ? { text: '遅刻', cls: 'text-amber-600 bg-amber-50' } : { text: '欠席', cls: 'text-rose-600 bg-rose-50' }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-slate-700 to-slate-600 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Admin</p>
        <h1 className="text-2xl font-bold">管理</h1>
        <p className="text-sm text-slate-300 mt-0.5">メンバー・シフト・MTG管理</p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { id: 'users', label: 'ユーザー・商材', icon: Users },
          { id: 'shifts', label: 'シフト管理', icon: Calendar },
          { id: 'mtg', label: 'MTG管理', icon: ClipboardList },
          { id: 'progress', label: '個人進捗', icon: BarChart2 },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setAdminTab(id as any)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${adminTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ===== ユーザー・商材タブ ===== */}
      {adminTab === 'users' && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><Link2 size={16} className="text-blue-600" />招待リンクを発行する</h3>
            <p className="text-xs text-gray-400 mb-4">有効期限7日間・1回限り使用可能です。</p>
            <button onClick={handleGenerateInvite} disabled={inviteLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <Link2 size={15} />{inviteLoading ? '生成中...' : '招待リンクを生成'}
            </button>
            {inviteUrl && (
              <div className="mt-4">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <span className="text-xs text-gray-600 flex-1 truncate font-mono">{inviteUrl}</span>
                  <button onClick={handleCopyInvite} className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md border border-gray-300 hover:bg-gray-100 transition-colors shrink-0">
                    {copiedInvite ? <><Check size={12} className="text-green-500" />コピー済み</> : <><Copy size={12} />コピー</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><PackagePlus size={16} className="text-blue-600" />取扱商材</h3>
            <p className="text-xs text-gray-400 mb-4">HKR入力・推移グラフで使用する商材を管理します。</p>
            <ul className="space-y-2 mb-4">
              {products.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-800 font-medium">{p.name}</span>
                  <button onClick={() => handleDeleteProduct(p.name)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={16} /></button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input type="text" value={newProduct} onChange={(e) => { setNewProduct(e.target.value); setProductError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()} placeholder="新しい商材名"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={handleAddProduct} disabled={addingProduct || !newProduct.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">追加</button>
            </div>
            {productError && <p className="mt-2 text-xs text-red-600">{productError}</p>}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-500">{users.length}人のメンバー</p>
            </div>
            <ul className="divide-y divide-gray-100">
              {users.map((user) => (
                <li key={user.id} className="flex items-center gap-4 px-4 py-4">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium shrink-0">{user.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email} · {ROLE_DESCRIPTIONS[user.role as Role]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {saved === user.id && <CheckCircle size={16} className="text-green-500" />}
                    <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                      disabled={saving === user.id || user.id === currentUserId}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed">
                      {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([r, l]) => <option key={r} value={r}>{l}</option>)}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-400">※ 自分自身のロールは変更できません</p>
            </div>
          </div>
        </>
      )}

      {/* ===== シフト管理タブ ===== */}
      {adminTab === 'shifts' && (
        <>
          <div className="flex items-center justify-center gap-4 mb-5">
            <button onClick={prevMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-indigo-50 text-indigo-600 font-bold transition flex items-center justify-center"><ChevronLeft size={18} /></button>
            <span className="text-xl font-bold text-gray-800 min-w-32 text-center">{year}年 {month}月</span>
            <button onClick={nextMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-indigo-50 text-indigo-600 font-bold transition flex items-center justify-center"><ChevronRight size={18} /></button>
          </div>

          {/* 締切設定 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">提出締切の設定</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="datetime-local" value={deadlineAt} onChange={(e) => setDeadlineAt(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button onClick={handleSaveDeadline} disabled={!deadlineAt}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {deadlineSaved ? '✓ 保存しました' : '保存'}
              </button>
              {deadlineAt && (
                <button onClick={handleDeleteDeadline} className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  締切を削除
                </button>
              )}
            </div>
          </div>

          {/* シフト一覧 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">シフト一覧</h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                提出済み {shifts.filter((s) => s.submitted).length} / {shifts.length} 人
              </span>
            </div>
            {shiftsLoading ? (
              <p className="text-gray-400 text-sm py-4 text-center">読み込み中...</p>
            ) : (
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="text-xs border-collapse w-full">
                  <thead>
                    <tr>
                      <th className="border border-gray-100 px-3 py-2.5 bg-gray-50 text-left min-w-20 sticky left-0 z-10 text-gray-600 font-semibold">名前</th>
                      <th className="border border-gray-100 px-2 py-2.5 bg-gray-50 text-center min-w-10 text-gray-600 font-semibold">提出</th>
                      {days.map((d) => {
                        const dow = new Date(year, month - 1, d).getDay()
                        const isToday = d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()
                        return (
                          <th key={d} className={`border border-gray-100 px-1 py-2.5 text-center w-8 font-semibold
                            ${isToday ? 'bg-indigo-600 text-white' : 'bg-gray-50'}
                            ${!isToday && dow === 0 ? 'text-rose-500' : ''}
                            ${!isToday && dow === 6 ? 'text-indigo-500' : ''}
                            ${!isToday && dow !== 0 && dow !== 6 ? 'text-gray-600' : ''}`}>{d}</th>
                        )
                      })}
                      <th className="border border-gray-100 px-2 py-2.5 bg-indigo-50 text-center min-w-10 text-indigo-600 font-bold">計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((member, idx) => (
                      <tr key={member.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="border border-gray-100 px-3 py-2 font-semibold text-gray-800 sticky left-0 bg-inherit">{member.name}</td>
                        <td className="border border-gray-100 px-2 py-2 text-center">
                          {member.submitted
                            ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 font-bold">✓</span>
                            : <span className="text-gray-300 font-bold">–</span>}
                        </td>
                        {days.map((d) => {
                          const dow = new Date(year, month - 1, d).getDay()
                          return (
                            <td key={d} className={`border border-gray-100 px-1 py-2 text-center ${dow === 0 ? 'bg-rose-50/40' : ''} ${dow === 6 ? 'bg-indigo-50/40' : ''}`}>
                              <WorkCell type={getWorkType(member.workDates, d)} />
                            </td>
                          )
                        })}
                        <td className="border border-gray-100 px-2 py-2 text-center bg-indigo-50 font-bold text-indigo-600">{memberTotal(member)}</td>
                      </tr>
                    ))}
                    {shifts.length === 0 && (
                      <tr><td colSpan={daysInMonth + 3} className="text-center text-gray-400 py-8">シフトデータがありません</td></tr>
                    )}
                    {shifts.length > 0 && (
                      <tr className="bg-indigo-50/60">
                        <td className="border border-gray-100 px-3 py-2 font-bold text-indigo-600 sticky left-0 bg-indigo-50/60">合計</td>
                        <td className="border border-gray-100 px-2 py-2" />
                        {days.map((d) => {
                          const dow = new Date(year, month - 1, d).getDay()
                          const total = dayTotal(d)
                          return (
                            <td key={d} className={`border border-gray-100 px-1 py-2 text-center font-bold ${total > 0 ? 'text-indigo-600' : 'text-gray-300'} ${dow === 0 ? 'bg-rose-50/40' : ''} ${dow === 6 ? 'bg-indigo-50/40' : ''}`}>
                              {total > 0 ? total : '·'}
                            </td>
                          )
                        })}
                        <td className="border border-gray-100 px-2 py-2 text-center bg-indigo-100 font-bold text-indigo-700">{grandTotal}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== MTG管理タブ ===== */}
      {adminTab === 'mtg' && (
        <>
          <div className="flex items-center justify-center gap-4 mb-5">
            <button onClick={prevMtgMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-emerald-50 text-emerald-600 font-bold transition flex items-center justify-center"><ChevronLeft size={18} /></button>
            <span className="text-xl font-bold text-gray-800 min-w-32 text-center">{mtgYear}年 {mtgMonth}月</span>
            <button onClick={nextMtgMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-emerald-50 text-emerald-600 font-bold transition flex items-center justify-center"><ChevronRight size={18} /></button>
          </div>

          {/* MTG締切設定 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">提出締切の設定</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="datetime-local" value={mtgDeadlineAt} onChange={(e) => setMtgDeadlineAt(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button onClick={handleSaveMtgDeadline} disabled={!mtgDeadlineAt}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {mtgDeadlineSaved ? '✓ 保存しました' : '保存'}
              </button>
              {mtgDeadlineAt && (
                <button onClick={handleDeleteMtgDeadline} className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  締切を削除
                </button>
              )}
            </div>
          </div>

          {/* MTG出欠一覧 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">MTG出欠一覧</h3>
            {!mtgData ? (
              <p className="text-gray-400 text-sm py-4 text-center">読み込み中...</p>
            ) : mtgData.dates.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">この月に金曜日はありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse w-full">
                  <thead>
                    <tr>
                      <th className="border border-gray-100 px-3 py-2.5 bg-gray-50 text-left min-w-20 sticky left-0 z-10 text-gray-600 font-semibold">名前</th>
                      {mtgData.dates.map((date) => (
                        <th key={date} className="border border-gray-100 px-2 py-2.5 bg-gray-50 text-center text-gray-600 font-semibold min-w-16">
                          {formatDate(date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mtgData.members.map((member, idx) => (
                      <tr key={member.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="border border-gray-100 px-3 py-2 font-semibold text-gray-800 sticky left-0 bg-inherit">{member.name}</td>
                        {mtgData.dates.map((date) => {
                          const rec = mtgData.map[member.id]?.[date]
                          if (!rec) return <td key={date} className="border border-gray-100 px-2 py-2 text-center text-gray-200">-</td>
                          const { text, cls } = statusLabel(rec.status)
                          return (
                            <td key={date} className="border border-gray-100 px-2 py-2 text-center">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{text}</span>
                              {rec.late_time && <p className="text-gray-400 mt-0.5">{rec.late_time}</p>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    {mtgData.members.length === 0 && (
                      <tr><td colSpan={mtgData.dates.length + 1} className="text-center text-gray-400 py-8">メンバーがいません</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== 個人進捗タブ ===== */}
      {adminTab === 'progress' && (
        <>
          <div className="flex items-center justify-center gap-4 mb-5">
            <button onClick={prevProgressMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-orange-50 text-orange-500 font-bold transition flex items-center justify-center"><ChevronLeft size={18} /></button>
            <span className="text-xl font-bold text-gray-800 min-w-32 text-center">{progressYear}年 {progressMonth}月</span>
            <button onClick={nextProgressMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-orange-50 text-orange-500 font-bold transition flex items-center justify-center"><ChevronRight size={18} /></button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600">{progressData.length}人のメンバー</p>
            </div>
            <div className="divide-y divide-gray-100">
              {progressData.map((m) => {
                const todayDay = today.getDate()
                const isCurrentMonth = progressYear === today.getFullYear() && progressMonth === today.getMonth() + 1
                const sortedDates: number[] = [...(m.workDates ?? [])].sort((a: number, b: number) => a - b)
                const total = sortedDates.length
                const workDaysTodayCount = isCurrentMonth
                  ? sortedDates.filter((d: number) => d <= todayDay).length
                  : total
                const targetByToday = total > 0 && m.cancelTarget > 0
                  ? Math.round((m.cancelTarget * workDaysTodayCount) / total)
                  : 0
                const diff = m.actualCancel - targetByToday
                const hasData = m.cancelTarget > 0 || m.actualCancel > 0

                return (
                  <div key={m.id} className="flex items-center px-4 py-4 gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {m.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                      {hasData ? (
                        <p className="text-xs text-gray-400">
                          実績 <span className="font-bold text-gray-600">{m.actualCancel}件</span>
                          　／　目標 <span className="font-bold text-gray-600">{m.cancelTarget}件</span>
                          　稼働 <span className="font-bold text-gray-600">{total}日</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-300">未設定</p>
                      )}
                    </div>
                    {hasData && total > 0 && m.cancelTarget > 0 && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-black shrink-0 ${
                        diff > 0 ? 'bg-emerald-50 text-emerald-600' :
                        diff < 0 ? 'bg-rose-50 text-rose-600' :
                        'bg-indigo-50 text-indigo-600'
                      }`}>
                        {diff > 0 ? <TrendingUp size={14} /> : diff < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                        {diff > 0 ? `アド ${diff}` : diff < 0 ? `ビハ ${Math.abs(diff)}` : 'オンタイム'}
                      </div>
                    )}
                  </div>
                )
              })}
              {progressData.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">読み込み中...</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
