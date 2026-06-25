'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Save, X } from 'lucide-react'
import TableScrollContainer from '@/components/TableScrollContainer'
import { useConfirm } from '@/components/useConfirm'

type ActivationType = 'sonet' | 'wimax_post' | 'wimax_direct' | 'all'

type ActivationRecord = {
  id: number
  type: ActivationType
  name: string
  date: string
  line: string
  cancel: string
  cancel_reason: string
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
  construction_type: string
  cancel_appt: string
  callback_info: string
  construction_time: string
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
  name: '', date: '', line: '', cancel: '', cancel_reason: '', neg_apply: '', neg_cancel: '', fm: '',
  week_after: '', day_before_construction: '', construction_date: '',
  day_before_delivery: '', delivery_date: '', week_after_delivery: '', activation: '',
  construction_type: '', cancel_appt: '', callback_info: '', construction_time: '',
}

const COLS: Record<Exclude<ActivationType, 'all'>, { key: keyof typeof emptyRecord; label: string }[]> = {
  sonet: [
    { key: 'name', label: '名前' },
    { key: 'date', label: '日にち' },
    { key: 'line', label: '回線' },
    { key: 'cancel', label: '解除' },
    { key: 'callback_info', label: '解除アポ/折り返し' },
    { key: 'neg_apply', label: '申込時ネガキャン' },
    { key: 'neg_cancel', label: '解除時ネガキャン' },
    { key: 'fm', label: 'FM' },
    { key: 'week_after', label: '獲得1週間後' },
    { key: 'day_before_construction', label: '工事日前日' },
    { key: 'construction_date', label: '工事日' },
    { key: 'construction_time', label: '工事時間帯' },
    { key: 'construction_type', label: '工事' },
    { key: 'activation', label: '開通' },
    { key: 'cancel_reason', label: 'キャンセル理由' },
  ],
  wimax_post: [
    { key: 'name', label: '名前' },
    { key: 'date', label: '日にち' },
    { key: 'line', label: '回線' },
    { key: 'cancel', label: '解除' },
    { key: 'callback_info', label: '解除アポ/折り返し' },
    { key: 'neg_apply', label: '申込時ネガキャン' },
    { key: 'neg_cancel', label: '解除時ネガキャン' },
    { key: 'fm', label: 'FM' },
    { key: 'day_before_delivery', label: '受け取り日前日' },
    { key: 'delivery_date', label: '受取日' },
    { key: 'week_after_delivery', label: '受け取り1週間後' },
    { key: 'activation', label: '開通' },
    { key: 'cancel_reason', label: 'キャンセル理由' },
  ],
  wimax_direct: [
    { key: 'name', label: '名前' },
    { key: 'date', label: '日にち' },
    { key: 'line', label: '回線' },
    { key: 'cancel', label: '解除' },
    { key: 'callback_info', label: '解除アポ/折り返し' },
    { key: 'neg_apply', label: '申込時ネガキャン' },
    { key: 'neg_cancel', label: '解除時ネガキャン' },
    { key: 'fm', label: 'FM' },
    { key: 'week_after', label: '獲得1週間後' },
    { key: 'activation', label: '開通' },
    { key: 'cancel_reason', label: 'キャンセル理由' },
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
  { key: 'callback_info',           label: '解除アポ/折り返し' },
  { key: 'neg_apply',               label: '申込時ネガキャン' },
  { key: 'neg_cancel',              label: '解除時ネガキャン' },
  { key: 'fm',                      label: 'FM' },
  { key: 'week_after',              label: '獲得1週間後' },
  { key: 'day_before_construction', label: '工事日前日' },
  { key: 'construction_date',       label: '工事日' },
  { key: 'construction_time',       label: '工事時間帯' },
  { key: 'day_before_delivery',     label: '受け取り日前日' },
  { key: 'delivery_date',           label: '受取日' },
  { key: 'week_after_delivery',     label: '受け取り1週間後' },
  { key: 'activation',              label: '開通' },
  { key: 'cancel_reason',           label: 'キャンセル理由' },
]

// 各タイプで使用しないフィールド（一覧でハイフン表示）
const TYPE_NA_FIELDS: Record<Exclude<ActivationType, 'all'>, (keyof ActivationRecord)[]> = {
  sonet:        ['day_before_delivery', 'delivery_date', 'week_after_delivery'],
  wimax_post:   ['week_after', 'day_before_construction', 'construction_date'],
  wimax_direct: ['day_before_construction', 'construction_date', 'day_before_delivery', 'delivery_date', 'week_after_delivery'],
}

type User = { id: number; name: string; role: string }

export default function ActivationPage() {
  const { confirm, ConfirmDialog } = useConfirm()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  // 様々な日付フォーマット (YYYY-MM-DD / YYYY-M-D / M/D / MM/DD / M月D日 / DD) を YYYY-MM-DD に正規化
  const normDate = (s: string, y: number, m: number): string => {
    if (!s || s === '未定' || s === '-') return ''
    const s2 = s.trim()
    // YYYY-MM-DD or YYYY-M-D
    const iso = s2.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/)
    if (iso) return `${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`
    // M/D or MM/DD or M月D日
    const md = s2.match(/^(\d{1,2})[\/月](\d{1,2})日?$/)
    if (md) return `${y}-${md[1].padStart(2,'0')}-${md[2].padStart(2,'0')}`
    // just day number
    const d = s2.match(/^(\d{1,2})$/)
    if (d) return `${y}-${String(m).padStart(2,'0')}-${d[1].padStart(2,'0')}`
    return ''
  }

  const DATE_FIELDS: (keyof ActivationRecord)[] = [
    'date','fm','week_after','day_before_construction','construction_date',
    'day_before_delivery','delivery_date','week_after_delivery',
  ]
  const [type, setType] = useState<ActivationType>('sonet')
  const [records, setRecords] = useState<ActivationRecord[]>([])
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState({ ...emptyRecord })
  const [saving, setSaving] = useState(false)
  const [cancelModal, setCancelModal] = useState<{ rec: ActivationRecord; reason: string } | null>(null)
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

  const cycleTextVal = (v: string) => v === '' ? '○' : v === '○' ? '×' : ''
  const cycleDoneVal = (v: number) => v === 0 ? 1 : v === 1 ? 2 : 0
  const textEmoji = (v: string) => v === '○' ? '⭕' : v === '×' ? '❌' : '🔘'
  const doneEmoji = (v: number) => v === 1 ? '⭕' : v === 2 ? '❌' : '🔘'

  // FM等トグル（3段階）
  const toggleDone = async (id: number, field: string, current: number) => {
    const newVal = cycleDoneVal(current)
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, [`${field}_done`]: newVal } : r))
    await fetch('/api/activation/done', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, field, done: newVal }),
    })
  }

  // 開通トグル（3段階）―❌のときキャンセル理由モーダルを表示
  const toggleActivation = async (rec: ActivationRecord) => {
    const newVal = cycleTextVal(rec.activation)
    setRecords((prev) => prev.map((r) => r.id === rec.id ? { ...r, activation: newVal } : r))
    if (newVal === '×') {
      setCancelModal({ rec: { ...rec, activation: newVal }, reason: rec.cancel_reason })
    } else {
      await patchRecord(buildPatch(rec, { activation: newVal }))
    }
  }

  const openCancelReasonModal = (rec: ActivationRecord) => {
    setCancelModal({ rec, reason: rec.cancel_reason })
  }

  const buildPatch = (rec: ActivationRecord, overrides: Partial<ActivationRecord>) => ({
    id: rec.id,
    name: rec.name, date: rec.date, line: rec.line, cancel: rec.cancel,
    cancel_reason: rec.cancel_reason,
    neg_apply: rec.neg_apply, neg_cancel: rec.neg_cancel, fm: rec.fm,
    week_after: rec.week_after, day_before_construction: rec.day_before_construction,
    construction_date: rec.construction_date, day_before_delivery: rec.day_before_delivery,
    delivery_date: rec.delivery_date, week_after_delivery: rec.week_after_delivery,
    activation: rec.activation, construction_type: rec.construction_type ?? '',
    cancel_appt: rec.cancel_appt ?? '', callback_info: rec.callback_info ?? '',
    construction_time: rec.construction_time ?? '',
    ...overrides,
  })

  const patchRecord = (body: object) =>
    fetch('/api/activation', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  // 解除トグル（3段階）
  const toggleCancel = async (rec: ActivationRecord) => {
    const newVal = cycleTextVal(rec.cancel)
    setRecords((prev) => prev.map((r) => r.id === rec.id ? { ...r, cancel: newVal } : r))
    await patchRecord(buildPatch(rec, { cancel: newVal }))
  }

  const saveCancelReason = async () => {
    if (!cancelModal) return
    const updated = buildPatch(cancelModal.rec, { activation: cancelModal.rec.activation, cancel_reason: cancelModal.reason })
    setRecords((prev) => prev.map((r) => r.id === cancelModal.rec.id ? { ...r, activation: cancelModal.rec.activation, cancel_reason: cancelModal.reason } : r))
    await patchRecord(updated)
    setCancelModal(null)
  }

  // 申込時ネガキャントグル（3段階）
  const toggleNegApply = async (rec: ActivationRecord) => {
    const newVal = cycleTextVal(rec.neg_apply)
    setRecords((prev) => prev.map((r) => r.id === rec.id ? { ...r, neg_apply: newVal } : r))
    await patchRecord(buildPatch(rec, { neg_apply: newVal }))
  }

  // 解除時ネガキャントグル（3段階）
  const toggleNegCancel = async (rec: ActivationRecord) => {
    const newVal = cycleTextVal(rec.neg_cancel)
    setRecords((prev) => prev.map((r) => r.id === rec.id ? { ...r, neg_cancel: newVal } : r))
    await patchRecord(buildPatch(rec, { neg_cancel: newVal }))
  }

  // 工事有無トグル（So-net用）: '' → '🐜' → '🍐' → ''
  const toggleConstructionType = async (rec: ActivationRecord) => {
    const vals = ['', '🐜', '🍐'] as const
    const next = vals[(vals.indexOf(rec.construction_type as typeof vals[number]) + 1) % vals.length]
    setRecords((prev) => prev.map((r) => r.id === rec.id ? { ...r, construction_type: next } : r))
    await patchRecord(buildPatch(rec, { construction_type: next }))
  }

  useEffect(() => {
    fetch('/api/push/subscribe').then((r) => r.json()).then((d) => setNotifEnabled(d.subscribed ?? false))
  }, [])

  useEffect(() => {
    fetch('/api/progress').then((r) => r.json()).then((data) => {
      const role = data.role ?? ''
      setMyRole(role)
      if (role === 'manager' || role === 'viewer' || role === 'admin') {
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
      cancel_reason: rec.cancel_reason,
      neg_apply: rec.neg_apply, neg_cancel: rec.neg_cancel, fm: rec.fm,
      week_after: rec.week_after, day_before_construction: rec.day_before_construction,
      construction_date: rec.construction_date, day_before_delivery: rec.day_before_delivery,
      delivery_date: rec.delivery_date, week_after_delivery: rec.week_after_delivery,
      activation: rec.activation, construction_type: rec.construction_type ?? '',
      cancel_appt: rec.cancel_appt ?? '', callback_info: rec.callback_info ?? '',
      construction_time: rec.construction_time ?? '',
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
    if (!await confirm('このレコードを削除しますか？')) return
    await fetch(`/api/activation?id=${id}`, { method: 'DELETE' })
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const addDays = (dateStr: string, days: number): string => {
    const d = new Date(dateStr + 'T00:00:00Z')
    if (isNaN(d.getTime())) return ''
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }

  const f = (key: keyof typeof emptyRecord) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setForm((p) => {
      const next = { ...p, [key]: val }
      if (!val || val === '未定') return next
      if (key === 'date') {
        const w = addDays(val, 7)
        if (w && p.week_after !== '未定') next.week_after = w
      } else if (key === 'construction_date') {
        const d = addDays(val, -1)
        if (d && p.day_before_construction !== '未定') next.day_before_construction = d
      } else if (key === 'day_before_construction') {
        const d = addDays(val, 1)
        if (d && p.construction_date !== '未定') next.construction_date = d
      } else if (key === 'delivery_date') {
        const before = addDays(val, -1)
        const after = addDays(val, 7)
        if (before && p.day_before_delivery !== '未定') next.day_before_delivery = before
        if (after && p.week_after_delivery !== '未定') next.week_after_delivery = after
      } else if (key === 'day_before_delivery') {
        const d = addDays(val, 1)
        if (d && p.delivery_date !== '未定') next.delivery_date = d
      }
      return next
    })
  }

  const cols = type !== 'all' ? COLS[type as Exclude<ActivationType, 'all'>] : COLS['sonet']


  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {ConfirmDialog}

      {/* キャンセル理由モーダル */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-1">キャンセル理由を入力</h3>
            <p className="text-xs text-gray-400 mb-3">省略可。キャンセル理由列からいつでも変更できます。</p>
            <input
              type="text"
              value={cancelModal.reason}
              onChange={(e) => setCancelModal((p) => p ? { ...p, reason: e.target.value } : p)}
              placeholder="例：転居、料金不満など"
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 mb-3"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') saveCancelReason() }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { saveCancelReason() }}
                className="flex-1 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600 transition"
              >
                保存
              </button>
              <button
                onClick={() => setCancelModal(null)}
                className="flex-1 py-1.5 border border-gray-200 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-50 transition"
              >
                スキップ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 bg-gradient-to-r from-violet-600 to-purple-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Activation</p>
        <h1 className="text-2xl font-bold">開通表</h1>
        <p className="text-sm text-violet-100 mt-0.5">月別の開通管理</p>
        <p className="text-xs text-violet-300 mt-1">DEBUG: today={todayStr} / rec0.date={records[0]?.date ?? 'none'}</p>
      </div>

      {/* 管理者：メンバー選択 */}
      {(myRole === 'manager' || myRole === 'viewer' || myRole === 'admin') && members.length > 0 && (
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
                  <th className="border border-gray-100 px-2 py-2.5 bg-gray-50 w-14" />
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && (
                  <tr>
                    <td colSpan={LIST_COLS.length + 2} className="border border-gray-100 px-4 py-8 text-center text-gray-400 text-sm">
                      データがありません
                    </td>
                  </tr>
                )}
                {records.map((rec, i) => {
                  const isToday = DATE_FIELDS.some(f => normDate(rec[f] as string, year, month) === todayStr)
                  const naFields = TYPE_NA_FIELDS[rec.type as Exclude<ActivationType, 'all'>] ?? []
                  return (
                    <tr key={rec.id} className={isToday ? 'bg-amber-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}>
                      <td className="border border-gray-100 px-2 py-2 text-center text-gray-400">{i + 1}</td>
                      {LIST_COLS.map((c) => {
                        const isNA = c.key !== 'type_label' && c.key !== 'cancel_reason' && naFields.includes(c.key as keyof ActivationRecord)
                        const isActivation = c.key === 'activation'
                        const isCancel = c.key === 'cancel'
                        const isNegApply = c.key === 'neg_apply'
                        const isNegCancel = c.key === 'neg_cancel'
                        const isCancelReason = c.key === 'cancel_reason'
                        const isDoneField = (DONE_KEYS as readonly string[]).includes(c.key)
                        const doneKey = `${c.key}_done` as keyof ActivationRecord
                        const doneVal = isDoneField ? (rec[doneKey] as number) : 0
                        const val = c.key === 'type_label'
                          ? TYPE_LABELS[rec.type as ActivationType] ?? rec.type
                          : rec[c.key as keyof ActivationRecord]
                        const cellBg = isNA ? 'bg-gray-50/50'
                          : isActivation ? (rec.activation === '○' ? 'bg-green-50' : rec.activation === '×' ? 'bg-red-50' : '')
                          : (isCancel || isNegApply || isNegCancel) ? (rec[c.key as keyof ActivationRecord] === '○' ? 'bg-red-50' : rec[c.key as keyof ActivationRecord] === '×' ? 'bg-amber-50' : '')
                          : isDoneField ? (doneVal === 1 ? 'bg-green-50' : doneVal === 2 ? 'bg-red-50' : '')
                          : ''
                        return (
                          <td key={c.key} className={`border border-gray-100 px-3 py-2 text-center ${cellBg}`}>
                            {isNA ? (
                              <span className="text-gray-300">-</span>
                            ) : isActivation ? (
                              <button onClick={() => toggleActivation(rec)} className="text-lg leading-none">
                                {textEmoji(rec.activation)}
                              </button>
                            ) : isCancelReason ? (
                              <button
                                onClick={() => openCancelReasonModal(rec)}
                                className="text-left text-xs text-gray-600 hover:text-violet-500 w-full min-w-[60px] px-1"
                              >
                                {rec.cancel_reason || <span className="text-gray-200">-</span>}
                              </button>
                            ) : isCancel ? (
                              <button onClick={() => toggleCancel(rec)} className="text-lg leading-none">
                                {textEmoji(rec.cancel)}
                              </button>
                            ) : isNegApply ? (
                              <button onClick={() => toggleNegApply(rec)} className="text-lg leading-none">
                                {textEmoji(rec.neg_apply)}
                              </button>
                            ) : isNegCancel ? (
                              <button onClick={() => toggleNegCancel(rec)} className="text-lg leading-none">
                                {textEmoji(rec.neg_cancel)}
                              </button>
                            ) : isDoneField && val ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-gray-700">{val as string}</span>
                                <button onClick={() => toggleDone(rec.id, c.key, doneVal)} className="text-lg leading-none">
                                  {doneEmoji(doneVal)}
                                </button>
                              </div>
                            ) : val ? (
                              c.key === 'date' && isToday ? (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-amber-700 font-semibold">{val as string}</span>
                                  <span className="bg-amber-400 text-white text-[9px] font-bold px-1 py-0.5 rounded leading-none">今日</span>
                                </div>
                              ) : (
                                <span className="text-gray-700">{val as string}</span>
                              )
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
              {records.map((rec, i) => {
                const isToday = DATE_FIELDS.some(f => normDate(rec[f] as string, year, month) === todayStr)
                return (
                <tr key={rec.id} className={isToday ? 'bg-amber-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}>
                  <td className="border border-gray-100 px-2 py-2 text-center text-gray-400">{i + 1}</td>
                  {cols.map((c) => {
                    const isDoneField = (DONE_KEYS as readonly string[]).includes(c.key)
                    const doneKey = `${c.key}_done` as keyof ActivationRecord
                    const doneVal = isDoneField ? (rec[doneKey] as number) : 0
                    const isActivation = c.key === 'activation'
                    const isCancel = c.key === 'cancel'
                    const isNegApply = c.key === 'neg_apply'
                    const isNegCancel = c.key === 'neg_cancel'
                    const isCancelReason = c.key === 'cancel_reason'
                    const isCellToday = (DATE_FIELDS as string[]).includes(c.key)
                      && normDate(rec[c.key] as string, year, month) === todayStr
                    const cellBg = isActivation
                      ? (rec.activation === '○' ? 'bg-green-50' : rec.activation === '×' ? 'bg-red-50' : '')
                      : (isCancel || isNegApply || isNegCancel)
                      ? (rec[c.key] === '○' ? 'bg-red-50' : rec[c.key] === '×' ? 'bg-amber-50' : '')
                      : isDoneField
                      ? (doneVal === 1 ? 'bg-green-50' : doneVal === 2 ? 'bg-red-50' : isCellToday ? 'bg-amber-100' : '')
                      : isCellToday ? 'bg-amber-100'
                      : ''
                    return (
                      <td key={c.key} className={`border border-gray-100 px-2 py-2 text-center ${cellBg}`}>
                        {isActivation ? (
                          <button onClick={() => toggleActivation(rec)} className="text-lg leading-none">
                            {textEmoji(rec.activation)}
                          </button>
                        ) : isCancelReason ? (
                          <button
                            onClick={() => openCancelReasonModal(rec)}
                            className="text-left text-xs text-gray-600 hover:text-violet-500 w-full min-w-[60px] px-1"
                          >
                            {rec.cancel_reason || <span className="text-gray-200">-</span>}
                          </button>
                        ) : isCancel ? (
                          <button onClick={() => toggleCancel(rec)} className="text-lg leading-none">
                            {textEmoji(rec.cancel)}
                          </button>
                        ) : isNegApply ? (
                          <button onClick={() => toggleNegApply(rec)} className="text-lg leading-none">
                            {textEmoji(rec.neg_apply)}
                          </button>
                        ) : isNegCancel ? (
                          <button onClick={() => toggleNegCancel(rec)} className="text-lg leading-none">
                            {textEmoji(rec.neg_cancel)}
                          </button>
                        ) : c.key === 'construction_type' ? (
                          <button
                            onClick={() => toggleConstructionType(rec)}
                            className="text-lg leading-none"
                            title={rec.construction_type === '🐜' ? '工事あり' : rec.construction_type === '🍐' ? '工事なし' : '未設定'}
                          >
                            {rec.construction_type || '🔘'}
                          </button>
                        ) : isDoneField && rec[c.key] ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className={isCellToday && doneVal === 0 ? 'text-amber-700 font-semibold' : 'text-gray-700'}>{rec[c.key]}</span>
                            {isCellToday && doneVal === 0 && <span className="bg-amber-400 text-white text-[9px] font-bold px-1 py-0.5 rounded leading-none">今日</span>}
                            <button
                              onClick={() => toggleDone(rec.id, c.key, doneVal)}
                              className="text-lg leading-none"
                            >
                              {doneEmoji(doneVal)}
                            </button>
                          </div>
                        ) : rec[c.key] ? (
                          isCellToday ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-amber-700 font-semibold">{rec[c.key]}</span>
                              <span className="bg-amber-400 text-white text-[9px] font-bold px-1 py-0.5 rounded leading-none">今日</span>
                            </div>
                          ) : (
                            <span className="text-gray-700">{rec[c.key]}</span>
                          )
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
                )
              })}
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
            {cols.filter(c => !['cancel', 'neg_apply', 'neg_cancel', 'activation', 'cancel_reason'].includes(c.key)).map((c) => {
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
          {type === 'sonet' && (
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-gray-500">工事の有無</span>
              {(['🐜', '🍐'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, construction_type: p.construction_type === v ? '' : v }))}
                  className={`text-xl px-2 py-1 rounded-lg transition ${form.construction_type === v ? 'bg-violet-100 ring-2 ring-violet-400' : 'bg-gray-50 hover:bg-gray-100'}`}
                  title={v === '🐜' ? '工事あり' : '工事なし'}
                >
                  {v}
                </button>
              ))}
              {form.construction_type && (
                <span className="text-xs text-gray-400">{form.construction_type === '🐜' ? '工事あり' : '工事なし'}</span>
              )}
            </div>
          )}
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
