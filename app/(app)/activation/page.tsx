'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Save, X } from 'lucide-react'
import TableScrollContainer from '@/components/TableScrollContainer'

type ActivationType = 'sonet' | 'wimax_post' | 'wimax_direct' | 'all'

type ActivationRecord = {
  id: number
  type: ActivationType
  name: string
  date: string
  line: string
  cancel: string
  neg_apply: string
  neg_cancel: string
  fm: string
  week_after: string
  day_before_construction: string
  construction_date: string
  day_before_delivery: string
  delivery_date: string
  week_after_delivery: string
  activation: string
  fm_done: number
  week_after_done: number
  day_before_construction_done: number
  construction_date_done: number
  day_before_delivery_done: number
  delivery_date_done: number
  week_after_delivery_done: number
}

const DONE_KEYS = [
  'fm', 'week_after', 'day_before_construction', 'construction_date',
  'day_before_delivery', 'delivery_date', 'week_after_delivery',
] as const

const emptyRecord = {
  name: '', date: '', line: '', cancel: '', neg_apply: '', neg_cancel: '', fm: '',
  week_after: '', day_before_construction: '', construction_date: '',
  day_before_delivery: '', delivery_date: '', week_after_delivery: '', activation: '',
}

const COLS: Record<Exclude<ActivationType, 'all'>, { key: keyof typeof emptyRecord; label: string }[]> = {
  sonet: [
    { key: 'name', label: '名前' },
    { key: 'date', label: '日にち' },
    { key: 'line', label: '回線' },
    { key: 'cancel', label: '解除' },
    { key: 'neg_apply', label: '申込時ネガキャン' },
    { key: 'neg_cancel', label: '解除時ネガキャン' },
    { key: 'fm', label: 'FM' },
    { key: 'week_after', label: '獲得1週間後' },
    { key: 'day_before_construction', label: '工事日前日' },
    { key: 'construction_date', label: '工事日' },
    { key: 'activation', label: '開通' },
  ],
  wimax_post: [
    { key: 'name', label: '名前' },
    { key: 'date', label: '日にち' },
    { key: 'line', label: '回線' },
    { key: 'cancel', label: '解除' },
    { key: 'neg_apply', label: '申込時ネガキャン' },
    { key: 'neg_cancel', label: '解除時ネガキャン' },
    { key: 'fm', label: 'FM' },
    { key: 'day_before_delivery', label: '受け取り日前日' },
    { key: 'delivery_date', label: '受取日' },
    { key: 'week_after_delivery', label: '受け取り1週間後' },
    { key: 'activation', label: '開通' },
  ],
  wimax_direct: [
    { key: 'name', label: '名前' },
    { key: 'date', label: '日にち' },
    { key: 'line', label: '回線' },
    { key: 'cancel', label: '解除' },
    { key: 'neg_apply', label: '申込時ネガキャン' },
    { key: 'neg_cancel', label: '解除時ネガキャン' },
    { key: 'fm', label: 'FM' },
    { key: 'week_after', label: '獲得1週間後' },
    { key: 'activation', label: '開通' },
  ],
}

const TYPE_LABELS: Record<ActivationType, string> = {
  sonet: 'So-net',
  wimax_post: 'WiMAX後送り',
  wimax_direct: 'WiMAX直せち',
  all: '一覧',
}

const LIST_COLS: { key: keyof ActivationRecord | 'type_label'; label: string }[] = [
  { key: 'type_label',              label: '種別' },
  { key: 'name',                    label: '名前' },
  { key: 'date',                    label: '日にち' },
  { key: 'line',                    label: '回線' },
  { key: 'cancel',                  label: '解除' },
  { key: 'neg_apply',               label: '申込時ネガキャン' },
  { key: 'neg_cancel',              label: '解除時ネガキャン' },
  { key: 'fm',                      label: 'FM' },
  { key: 'week_after',              label: '獲得1週間後' },
  { key: 'day_before_construction', label: '工事日前日' },
  { key: 'construction_date',       label: '工事日' },
  { key: 'day_before_delivery',     label: '受け取り日前日' },
  { key: 'delivery_date',           label: '受取日' },
  { key: 'week_after_delivery',     label: '受け取り1週間後' },
  { key: 'activation',              label: '開通' },
]

// 各タイプで使用しないフィールド（一覧でハイフン表示）
const TYPE_NA_FIELDS: Record<Exclude<ActivationType, 'all'>, (keyof ActivationRecord)[]> = {
  sonet:        ['day_before_delivery', 'delivery_date', 'week_after_delivery'],
  wimax_post:   ['week_after', 'day_before_construction', 'construction_date'],
  wimax_direct: ['day_before_construction', 'construction_date', 'day_before_delivery', 'delivery_date', 'week_after_delivery'],
}

type User = { id: number; name: string; role: string }

export default function ActivationPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [type, setType] = useState<ActivationType>('sonet')
  const [records, setRecords] = useState<ActivationRecord[]>([])
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState({ ...emptyRecord })
  const [saving, setSaving] = useState(false)
  const [myRole, setMyRole] = useState<string>('')
  const [members, setMembers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [notifEnabled, setNotifEnabled] = useState(false)

  // 通知許可 & 購読
  const enableNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('このブラウザはプッシュ通知に対応していません')
      return
    }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') { alert('通知が許可されませんでした'); return }

    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    })
    setNotifEnabled(true)
    alert('通知を有効にしました。毎日20時に未確認項目を通知します。')
  }

  const disableNotifications = async () => {
    await fetch('/api/push/subscribe', { method: 'DELETE' })
    setNotifEnabled(false)
  }

  // FM等 ⭕️トグル
  const toggleDone = async (id: number, field: string, current: number) => {
    const newVal = current === 0 ? 1 : 0
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, [`${field}_done`]: newVal } : r))
    await fetch('/api/activation/done', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, field, done: newVal }),
    })
  }

  // 開通⭕️トグル
  const toggleActivation = async (rec: ActivationRecord) => {
    const newVal = rec.activation ? '' : '○'
    setRecords((prev) => prev.map((r) => r.id === rec.id ? { ...r, activation: newVal } : r))
    await patchRecord(buildPatch(rec, { activation: newVal }))
  }

  const buildPatch = (rec: ActivationRecord, overrides: Partial<ActivationRecord>) => ({
    id: rec.id,
    name: rec.name, date: rec.date, line: rec.line, cancel: rec.cancel,
    neg_apply: rec.neg_apply, neg_cancel: rec.neg_cancel, fm: rec.fm,
    week_after: rec.week_after, day_before_construction: rec.day_before_construction,
    construction_date: rec.construction_date, day_before_delivery: rec.day_before_delivery,
    delivery_date: rec.delivery_date, week_after_delivery: rec.week_after_delivery,
    activation: rec.activation,
    ...overrides,
  })

  const patchRecord = (body: object) =>
    fetch('/api/activation', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  // 解除⭕️トグル
  const toggleCancel = async (rec: ActivationRecord) => {
    const newVal = rec.cancel ? '' : '○'
    setRecords((prev) => prev.map((r) => r.id === rec.id ? { ...r, cancel: newVal } : r))
    await patchRecord(buildPatch(rec, { cancel: newVal }))
  }

  // 申込時ネガキャン⭕️トグル
  const toggleNegApply = async (rec: ActivationRecord) => {
    const newVal = rec.neg_apply ? '' : '○'
    setRecords((prev) => prev.map((r) => r.id === rec.id ? { ...r, neg_apply: newVal } : r))
    await patchRecord(buildPatch(rec, { neg_apply: newVal }))
  }

  // 解除時ネガキャン⭕️トグル
  const toggleNegCancel = async (rec: ActivationRecord) => {
    const newVal = rec.neg_cancel ? '' : '○'
    setRecords((prev) => prev.map((r) => r.id === rec.id ? { ...r, neg_cancel: newVal } : r))
    await patchRecord(buildPatch(rec, { neg_cancel: newVal }))
  }

  useEffect(() => {
    fetch('/api/push/subscribe').then((r) => r.json()).then((d) => setNotifEnabled(d.subscribed ?? false))
  }, [])

  useEffect(() => {
    fetch('/api/progress').then((r) => r.json()).then((data) => {
      const role = data.role ?? ''
      setMyRole(role)
      if (role === 'manager' || role === 'viewer') {
        fetch('/api/users').then((r) => r.json()).then((users: User[]) => {
          setMembers(users.filter((u) => u.role !== 'viewer'))
        })
      }
    })
  }, [])

  const parseDate = (s: string) => {
    if (!s) return 0
    // YYYY-MM-DD, YYYY/MM/DD, MM/DD, M/D, M月D日 など対応
    const iso = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
    if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3])).getTime()
    const md = s.match(/(\d{1,2})[\/月](\d{1,2})/)
    if (md) return new Date(year, parseInt(md[1]) - 1, parseInt(md[2])).getTime()
    const d = s.match(/^(\d{1,2})$/)
    if (d) return parseInt(d[1])
    return 0
  }

  const fetchRecords = () => {
    const userParam = selectedUserId ? `&userId=${selectedUserId}` : ''
    fetch(`/api/activation?year=${year}&month=${month}&type=${type}${userParam}`)
      .then((r) => r.json())
      .then((data: ActivationRecord[]) => {
        if (!Array.isArray(data)) return
        if (type === 'all') {
          data.sort((a, b) => parseDate(a.date) - parseDate(b.date))
        }
        setRecords(data)
      })
  }

  useEffect(() => { fetchRecords() }, [year, month, type, selectedUserId])

  const prevMonth = () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) }

  const openEdit = (rec: ActivationRecord) => {
    setEditingId(rec.id)
    setForm({
      name: rec.name, date: rec.date, line: rec.line, cancel: rec.cancel,
      neg_apply: rec.neg_apply, neg_cancel: rec.neg_cancel, fm: rec.fm,
      week_after: rec.week_after, day_before_construction: rec.day_before_construction,
      construction_date: rec.construction_date, day_before_delivery: rec.day_before_delivery,
      delivery_date: rec.delivery_date, week_after_delivery: rec.week_after_delivery, activation: rec.activation,
    })
  }

  const openNew = () => {
    setEditingId('new')
    setForm({ ...emptyRecord })
  }

  const handleSave = async () => {
    setSaving(true)
    if (editingId === 'new') {
      const res = await fetch('/api/activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, type, ...form }),
      })
      if (res.ok) fetchRecords()
    } else {
      await fetch('/api/activation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...form }),
      })
      fetchRecords()
    }
    setSaving(false)
    setEditingId(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/activation?id=${id}`, { method: 'DELETE' })
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const f = (key: keyof typeof emptyRecord) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  const cols = type !== 'all' ? COLS[type as Exclude<ActivationType, 'all'>] : COLS['sonet']


  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-violet-600 to-purple-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Activation</p>
        <h1 className="text-2xl font-bold">開通表</h1>
        <p className="text-sm text-violet-100 mt-0.5">月別の開通管理</p>
      </div>

      {/* 管理者：メンバー選択 */}
      {(myRole === 'manager' || myRole === 'viewer') && members.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-500 shrink-0">メンバー</span>
          <select
            value={selectedUserId ?? ''}
            onChange={(e) => { setSelectedUserId(e.target.value ? Number(e.target.value) : null); setEditingId(null) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          >
            <option value="">自分</option>
            {members.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* 月選択 */}
      <div className="flex items-center justify-center gap-4 mb-5">
        <button onClick={prevMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-violet-50 text-violet-500 font-bold transition flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <span className="text-xl font-bold text-gray-800 min-w-32 text-center">{year}年 {month}月</span>
        <button onClick={nextMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-violet-50 text-violet-500 font-bold transition flex items-center justify-center">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* タイプタブ */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(Object.keys(TYPE_LABELS) as ActivationType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setEditingId(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              type === t ? 'bg-violet-500 text-white shadow' : 'bg-white text-gray-500 hover:bg-violet-50 shadow-sm'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* 一覧タブ */}
      {type === 'all' && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <TableScrollContainer>
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr>
                  <th className="border border-gray-100 px-3 py-2.5 bg-gray-50 text-center text-gray-600 font-semibold w-6">#</th>
                  {LIST_COLS.map((c) => (
                    <th key={c.key} className="border border-gray-100 px-3 py-2.5 bg-gray-50 text-center text-gray-600 font-semibold whitespace-nowrap">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && (
                  <tr>
                    <td colSpan={LIST_COLS.length + 1} className="border border-gray-100 px-4 py-8 text-center text-gray-400 text-sm">
                      データがありません
                    </td>
                  </tr>
                )}
                {records.map((rec, i) => {
                  const naFields = TYPE_NA_FIELDS[rec.type as Exclude<ActivationType, 'all'>] ?? []
                  return (
                    <tr key={rec.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}>
                      <td className="border border-gray-100 px-2 py-2 text-center text-gray-400">{i + 1}</td>
                      {LIST_COLS.map((c) => {
                        const isNA = c.key !== 'type_label' && naFields.includes(c.key as keyof ActivationRecord)
                        const isActivation = c.key === 'activation'
                        const isCancel = c.key === 'cancel'
                        const isNegApply = c.key === 'neg_apply'
                        const isNegCancel = c.key === 'neg_cancel'
                        const val = c.key === 'type_label'
                          ? TYPE_LABELS[rec.type as ActivationType] ?? rec.type
                          : rec[c.key as keyof ActivationRecord]
                        return (
                          <td key={c.key} className={`border border-gray-100 px-3 py-2 text-center ${isNA ? 'bg-gray-50/50' : ''} ${isActivation && rec.activation ? 'bg-green-50' : ''} ${(isCancel || isNegApply || isNegCancel) && rec[c.key as keyof ActivationRecord] ? 'bg-red-50' : ''}`}>
                            {isNA ? (
                              <span className="text-gray-300">-</span>
                            ) : isActivation ? (
                              <button onClick={() => toggleActivation(rec)} className="text-lg leading-none" title={rec.activation ? '取り消す' : '開通確認'}>
                                {rec.activation ? '⭕' : '🔘'}
                              </button>
                            ) : isCancel ? (
                              <button onClick={() => toggleCancel(rec)} className="text-lg leading-none" title={rec.cancel ? '取り消す' : '解除確認'}>
                                {rec.cancel ? '⭕' : '🔘'}
                              </button>
                            ) : isNegApply ? (
                              <button onClick={() => toggleNegApply(rec)} className="text-lg leading-none" title={rec.neg_apply ? '取り消す' : '申込時ネガキャン確認'}>
                                {rec.neg_apply ? '⭕' : '🔘'}
                              </button>
                            ) : isNegCancel ? (
                              <button onClick={() => toggleNegCancel(rec)} className="text-lg leading-none" title={rec.neg_cancel ? '取り消す' : '解除時ネガキャン確認'}>
                                {rec.neg_cancel ? '⭕' : '🔘'}
                              </button>
                            ) : val ? (
                              <span className="text-gray-700">{val as string}</span>
                            ) : (
                              <span className="text-gray-200">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableScrollContainer>
        </div>
      )}

      {/* 個別タイプのテーブル */}
      {type !== 'all' && (
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <TableScrollContainer>
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr>
                <th className="border border-gray-100 px-3 py-2.5 bg-gray-50 text-center text-gray-600 font-semibold w-6">#</th>
                {cols.map((c) => (
                  <th key={c.key} className="border border-gray-100 px-3 py-2.5 bg-gray-50 text-center text-gray-600 font-semibold whitespace-nowrap">{c.label}</th>
                ))}
                <th className="border border-gray-100 px-2 py-2.5 bg-gray-50 w-14" />
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr>
                  <td colSpan={cols.length + 2} className="border border-gray-100 px-4 py-8 text-center text-gray-400 text-sm">
                    データがありません
                  </td>
                </tr>
              )}
              {records.map((rec, i) => (
                <tr key={rec.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}>
                  <td className="border border-gray-100 px-2 py-2 text-center text-gray-400">{i + 1}</td>
                  {cols.map((c) => {
                    const isDoneField = (DONE_KEYS as readonly string[]).includes(c.key)
                    const doneKey = `${c.key}_done` as keyof ActivationRecord
                    const isDone = isDoneField && rec[doneKey] === 1
                    const isActivation = c.key === 'activation'
                    const isCancel = c.key === 'cancel'
                    const isNegApply = c.key === 'neg_apply'
                    const isNegCancel = c.key === 'neg_cancel'
                    return (
                      <td key={c.key} className={`border border-gray-100 px-2 py-2 text-center ${isDone ? 'bg-green-50' : ''} ${isActivation && rec.activation ? 'bg-green-50' : ''} ${(isCancel || isNegApply || isNegCancel) && rec[c.key] ? 'bg-red-50' : ''}`}>
                        {isActivation ? (
                          <button onClick={() => toggleActivation(rec)} className="text-lg leading-none" title={rec.activation ? '取り消す' : '開通確認'}>
                            {rec.activation ? '⭕' : '🔘'}
                          </button>
                        ) : isCancel ? (
                          <button onClick={() => toggleCancel(rec)} className="text-lg leading-none" title={rec.cancel ? '取り消す' : '解除確認'}>
                            {rec.cancel ? '⭕' : '🔘'}
                          </button>
                        ) : isNegApply ? (
                          <button onClick={() => toggleNegApply(rec)} className="text-lg leading-none" title={rec.neg_apply ? '取り消す' : '申込時ネガキャン確認'}>
                            {rec.neg_apply ? '⭕' : '🔘'}
                          </button>
                        ) : isNegCancel ? (
                          <button onClick={() => toggleNegCancel(rec)} className="text-lg leading-none" title={rec.neg_cancel ? '取り消す' : '解除時ネガキャン確認'}>
                            {rec.neg_cancel ? '⭕' : '🔘'}
                          </button>
                        ) : isDoneField && rec[c.key] ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-gray-700">{rec[c.key]}</span>
                            <button
                              onClick={() => toggleDone(rec.id, c.key, rec[doneKey] as number)}
                              className="text-lg leading-none"
                              title={isDone ? '未完了に戻す' : '完了にする'}
                            >
                              {isDone ? '⭕' : '🔘'}
                            </button>
                          </div>
                        ) : rec[c.key] ? (
                          <span className="text-gray-700">{rec[c.key]}</span>
                        ) : (
                          <span className="text-gray-200">-</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="border border-gray-100 px-2 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(rec)} className="text-gray-300 hover:text-violet-500 transition">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(rec.id)} className="text-gray-300 hover:text-red-400 transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScrollContainer>
      </div>
      )}

      {/* 追加ボタン */}
      {editingId === null && type !== 'all' && (
        <button
          onClick={openNew}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-violet-500 text-white text-sm font-medium rounded-lg hover:bg-violet-600 transition shadow"
        >
          <Plus size={16} />
          行を追加
        </button>
      )}

      {/* 編集/追加フォーム */}
      {editingId !== null && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 mt-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">{editingId === 'new' ? '新規追加' : '編集'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {cols.filter(c => !['cancel', 'neg_apply', 'neg_cancel', 'activation'].includes(c.key)).map((c) => {
              const isDateField = ['date', 'fm', 'week_after', 'day_before_construction', 'construction_date', 'day_before_delivery', 'delivery_date', 'week_after_delivery'].includes(c.key)
              const isUndecided = isDateField && form[c.key] === '未定'
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-xs text-gray-500">{c.label}</label>
                    {isDateField && (
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, [c.key]: isUndecided ? '' : '未定' }))}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${isUndecided ? 'bg-gray-400 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                      >
                        未定
                      </button>
                    )}
                  </div>
                  {isDateField && isUndecided ? (
                    <div className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-400">未定</div>
                  ) : (
                    <input
                      type={isDateField ? 'date' : 'text'}
                      value={form[c.key]}
                      onChange={f(c.key)}
                      className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setEditingId(null)}
              className="flex-1 py-1.5 border border-gray-200 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-50 transition">
              キャンセル
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition">
              <Save size={12} />{saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
