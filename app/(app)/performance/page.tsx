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

type MonthlyRecord = {
  year: number
  month: number
  totalActivation: number
  totalCancel: number
  memberCount: number
  note: string
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

function fiscalYear(dateStr: string): number {
  if (!dateStr) return 0
  const [y, m] = dateStr.split('-').map(Number)
  return m >= 4 ? y : y - 1
}

function monthlyFiscalYear(year: number, month: number): number {
  return month >= 4 ? year : year - 1
}

export default function PerformancePage() {
  const [records, setRecords] = useState<MemberPerformance[]>([])
  const [monthly, setMonthly] = useState<MonthlyRecord[]>([])
  const [role, setRole] = useState<string>('member')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedingMonthly, setSeedingMonthly] = useState(false)
  const [editingMonth, setEditingMonth] = useState<{ year: number; month: number } | null>(null)
  const [monthForm, setMonthForm] = useState({ totalActivation: '', totalCancel: '', memberCount: '', note: '' })
  const [savingMonth, setSavingMonth] = useState(false)
  const [selectedFY, setSelectedFY] = useState<number>(0)
  const [selectedYear, setSelectedYear] = useState<number>(0)
  const [selectedName, setSelectedName] = useState<string>('')
  const [selectedPersonalYear, setSelectedPersonalYear] = useState<number>(0)
  const [memberMonthly, setMemberMonthly] = useState<{member_name:string;year:number;month:number;total_activation:number;total_cancel:number;work_days:number}[]>([])
  const [editingPersonalMonth, setEditingPersonalMonth] = useState<number | null>(null)
  const [personalMonthForm, setPersonalMonthForm] = useState({ totalActivation: '', totalCancel: '', workDays: '' })
  const [savingPersonalMonth, setSavingPersonalMonth] = useState(false)
  const [tab, setTab] = useState<'personal' | 'team'>('personal')
  const [personalTab, setPersonalTab] = useState<'view' | 'add' | 'delete'>('view')
  const [extraPersonalYears, setExtraPersonalYears] = useState<number[]>([])
  const [showAddYear, setShowAddYear] = useState(false)
  const [newYearInput, setNewYearInput] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberInput, setNewMemberInput] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [extraTeamYears, setExtraTeamYears] = useState<number[]>([])
  const [showAddTeamYear, setShowAddTeamYear] = useState(false)
  const [newTeamYearInput, setNewTeamYearInput] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setRole(d.role ?? 'member'))
    const saved = localStorage.getItem('extraPersonalYears')
    if (saved) setExtraPersonalYears(JSON.parse(saved))
    const savedTeam = localStorage.getItem('extraTeamYears')
    if (savedTeam) setExtraTeamYears(JSON.parse(savedTeam))
  }, [])

  // 名前が変わったら全期間の月次データを取得（年は関係なく全件）
  useEffect(() => {
    if (!selectedName) return
    fetch(`/api/performance/member-monthly?name=${encodeURIComponent(selectedName)}`)
      .then((r) => r.json()).then(setMemberMonthly)
  }, [selectedName])

  useEffect(() => {
    if (role !== 'manager') return
    fetch('/api/performance').then((r) => r.json()).then((rows: MemberPerformance[]) => {
      setRecords(rows)
      if (rows.length > 0) {
        const years = rows.map((r) => fiscalYear(r.period_start)).filter(Boolean)
        setSelectedFY(Math.max(...years))
        setSelectedName(rows[0].name)
        setSelectedPersonalYear(new Date().getFullYear())
      }
    })
    fetch('/api/performance/monthly').then((r) => r.json()).then((rows: MonthlyRecord[]) => {
      setMonthly(rows)
      if (rows.length > 0) {
        setSelectedYear(Math.max(...rows.map((r) => r.year)))
      }
    })
  }, [role])

  // マネージャー以外はアクセス不可
  if (role && role !== 'manager') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-sm">このページはマネージャーのみ閲覧できます</p>
      </div>
    )
  }

  // 個人タブ用年度一覧（降順）
  const personalFYs = [...new Set(records.map((r) => fiscalYear(r.period_start)).filter(Boolean))].sort((a, b) => b - a)

  // 全体タブ用暦年一覧（降順）
  const teamYears = [...new Set([...monthly.map((r) => r.year), ...extraTeamYears])].sort((a, b) => b - a)

  const filteredRecords = selectedName ? records.filter((r) => r.name === selectedName) : records

  // 選択年の月次データでメンバー統計を計算
  const yearMonthly = memberMonthly.filter((r) => r.year === selectedPersonalYear)
  const monthsWithActivation = yearMonthly.filter((r) => r.total_activation > 0)
  const monthsWithCancel = yearMonthly.filter((r) => r.total_cancel > 0)
  const monthsWithWork = yearMonthly.filter((r) => r.work_days > 0)
  const allMonthsTotal = {
    activation: yearMonthly.reduce((s, r) => s + r.total_activation, 0),
    cancel: yearMonthly.reduce((s, r) => s + r.total_cancel, 0),
    workDays: yearMonthly.reduce((s, r) => s + r.work_days, 0),
  }
  const memberAvg = {
    activation: monthsWithActivation.length > 0
      ? Math.round(allMonthsTotal.activation / monthsWithActivation.length) : 0,
    cancel: monthsWithCancel.length > 0
      ? Math.round(allMonthsTotal.cancel / monthsWithCancel.length) : 0,
    workDays: monthsWithWork.length > 0
      ? Math.round(allMonthsTotal.workDays / monthsWithWork.length) : 0,
  }
  const hasMonthlyData = yearMonthly.length > 0

  // 個人タブ：年一覧（2022〜当年 + 追加分）
  const currentYear = new Date().getFullYear()
  const basePersonalYears = Array.from({ length: currentYear - 2021 }, (_, i) => currentYear - i)
  const personalYears = [...new Set([...basePersonalYears, ...extraPersonalYears])].sort((a, b) => b - a)

  // 個人タブ：選択年の月次データ（1〜12月埋め）
  const filteredMemberMonthly = (() => {
    const dataMap = new Map(
      memberMonthly.filter((r) => r.year === selectedPersonalYear).map((r) => [r.month, r])
    )
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      return dataMap.get(m) ?? { member_name: selectedName, year: selectedPersonalYear, month: m, total_activation: 0, total_cancel: 0, work_days: 0 }
    })
  })()

  // 個人タブ：選択年の合計
  const memberYearTotal = memberMonthly
    .filter((r) => r.year === selectedPersonalYear)
    .reduce((acc, r) => ({ activation: acc.activation + r.total_activation, cancel: acc.cancel + r.total_cancel }), { activation: 0, cancel: 0 })

  // 暦年フィルタ後の月次レコード（1〜12月の順）
  const filteredMonthly = (() => {
    // 選択年の1〜12月をすべて並べ、データがない月は 0 で埋める
    const dataMap = new Map(
      monthly.filter((r) => r.year === selectedYear).map((r) => [r.month, r])
    )
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      return dataMap.get(m) ?? { year: selectedYear, month: m, totalActivation: 0, totalCancel: 0, memberCount: 0, note: '' }
    })
  })()

  // 全体タブの年間合計（データがある月のみ）
  const teamTotal = monthly
    .filter((r) => r.year === selectedYear)
    .reduce(
      (acc, r) => ({ activation: acc.activation + r.totalActivation, cancel: acc.cancel + r.totalCancel }),
      { activation: 0, cancel: 0 }
    )

  const openEditPersonalMonth = (month: number, data?: { total_activation: number; total_cancel: number; work_days: number }) => {
    setEditingPersonalMonth(month)
    setPersonalMonthForm({
      totalActivation: data && data.total_activation > 0 ? String(data.total_activation) : '',
      totalCancel: data && data.total_cancel > 0 ? String(data.total_cancel) : '',
      workDays: data && data.work_days > 0 ? String(data.work_days) : '',
    })
  }

  const handleSavePersonalMonth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPersonalMonth || !selectedName || !selectedPersonalYear) return
    setSavingPersonalMonth(true)
    const res = await fetch('/api/performance/member-monthly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberName: selectedName,
        year: selectedPersonalYear,
        month: editingPersonalMonth,
        totalActivation: parseInt(personalMonthForm.totalActivation) || 0,
        totalCancel: parseInt(personalMonthForm.totalCancel) || 0,
        workDays: parseInt(personalMonthForm.workDays) || 0,
      }),
    })
    if (res.ok) setMemberMonthly(await res.json())
    setSavingPersonalMonth(false)
    setEditingPersonalMonth(null)
  }

  const openEditMonth = (r: MonthlyRecord) => {
    setEditingMonth({ year: r.year, month: r.month })
    setMonthForm({
      totalActivation: r.totalActivation > 0 ? String(r.totalActivation) : '',
      totalCancel: r.totalCancel > 0 ? String(r.totalCancel) : '',
      memberCount: r.memberCount > 0 ? String(r.memberCount) : '',
      note: r.note ?? '',
    })
  }

  const handleSaveMonth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMonth) return
    setSavingMonth(true)
    const res = await fetch('/api/performance/monthly/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: editingMonth.year,
        month: editingMonth.month,
        totalActivation: parseInt(monthForm.totalActivation) || 0,
        totalCancel: parseInt(monthForm.totalCancel) || 0,
        memberCount: parseInt(monthForm.memberCount) || 0,
        note: monthForm.note,
      }),
    })
    if (res.ok) {
      const rows = await fetch('/api/performance/monthly').then((r) => r.json())
      setMonthly(rows)
    }
    setSavingMonth(false)
    setEditingMonth(null)
  }

  const handleSeedMonthly = async () => {
    if (!confirm('月次データ（2022〜2026）を一括登録しますか？')) return
    setSeedingMonthly(true)
    const res = await fetch('/api/performance/monthly/seed', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      const rows = await fetch('/api/performance/monthly').then((r) => r.json())
      setMonthly(rows)
      if (rows.length > 0) setSelectedYear(Math.max(...rows.map((r: MonthlyRecord) => r.year)))
    } else {
      alert(data.error ?? 'エラーが発生しました')
    }
    setSeedingMonthly(false)
  }

  const handleSeed = async () => {
    if (!confirm('初期データ（21名）を一括登録しますか？')) return
    setSeeding(true)
    const res = await fetch('/api/performance/seed', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      const rows = await fetch('/api/performance').then((r) => r.json())
      setRecords(rows)
    } else {
      alert(data.error ?? 'エラーが発生しました')
    }
    setSeeding(false)
  }

  const openAdd = () => { setEditId(null); setForm({ ...emptyForm }); setPersonalTab('add') }

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
    setPersonalTab('add')
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
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        setRecords((prev) => prev.map((r) => (r.id === editId ? updated : r)))
      }
    } else {
      const res = await fetch('/api/performance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        const created = await res.json()
        setRecords((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
      }
    }
    setSaving(false); setPersonalTab('view'); setEditId(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/performance/${id}`, { method: 'DELETE' })
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  const cancelRate = (a: number, c: number) => a === 0 ? '-' : `${Math.round((c / a) * 100)}%`

  const periodMonths = (r: MemberPerformance) => {
    if (!r.period_start || !r.period_end) return 1
    const [sy, sm] = r.period_start.split('-').map(Number)
    const [ey, em] = r.period_end.split('-').map(Number)
    const m = (ey - sy) * 12 + (em - sm) + 1
    return m > 0 ? m : 1
  }

  const f = (v: string | undefined, key: keyof typeof form) =>
    setForm((prev) => ({ ...prev, [key]: v ?? '' }))

  const switchTab = (t: 'personal' | 'team') => {
    setTab(t)
  }

  const handleAddMember = async () => {
    const name = newMemberInput.trim()
    if (!name) return
    setAddingMember(true)
    const res = await fetch('/api/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, activationTarget: 0, cancelTarget: 0, workDaysTarget: 0, periodStart: '', periodEnd: '', totalWork: 0, totalActivation: 0, totalCancel: 0, note: '', sortOrder: 0 }),
    })
    if (res.ok) {
      const created = await res.json()
      setRecords((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
      setSelectedName(created.name)
      setPersonalTab('view')
    }
    setAddingMember(false)
    setShowAddMember(false)
    setNewMemberInput('')
  }

  const handleAddTeamYear = () => {
    const y = parseInt(newTeamYearInput)
    if (!y || y < 2000 || y > 2100) return
    if (teamYears.includes(y)) { setShowAddTeamYear(false); setNewTeamYearInput(''); setSelectedYear(y); return }
    const updated = [...extraTeamYears, y]
    setExtraTeamYears(updated)
    localStorage.setItem('extraTeamYears', JSON.stringify(updated))
    setSelectedYear(y)
    setShowAddTeamYear(false)
    setNewTeamYearInput('')
  }

  const handleAddYear = () => {
    const y = parseInt(newYearInput)
    if (!y || y < 2000 || y > 2100) return
    if (personalYears.includes(y)) { setShowAddYear(false); setNewYearInput(''); return }
    const updated = [...extraPersonalYears, y]
    setExtraPersonalYears(updated)
    localStorage.setItem('extraPersonalYears', JSON.stringify(updated))
    setSelectedPersonalYear(y)
    setShowAddYear(false)
    setNewYearInput('')
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-violet-600 to-purple-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Performance</p>
        <h1 className="text-2xl font-bold">実績</h1>
        <p className="text-sm text-violet-100 mt-0.5">メンバーの累計実績を管理</p>
      </div>

      {/* タブ */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        {(['personal', 'team'] as const).map((t) => (
          <button key={t} onClick={() => switchTab(t)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition
              ${tab === t ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'personal' ? '個人' : '全体'}
          </button>
        ))}
      </div>

      {/* 個人タブ：名前選択バー */}
      {tab === 'personal' && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 items-center">
          {records.map((r) => (
            <button key={r.id} onClick={() => { setSelectedName(r.name); setPersonalTab('view') }}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition
                ${selectedName === r.name && personalTab !== 'add' ? 'bg-violet-500 text-white shadow-sm' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-violet-50'}`}>
              {r.name}
            </button>
          ))}
          {role === 'manager' && (
            showAddMember ? (
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="text"
                  value={newMemberInput}
                  onChange={(e) => setNewMemberInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddMember(); if (e.key === 'Escape') { setShowAddMember(false); setNewMemberInput('') } }}
                  placeholder="名前を入力"
                  autoFocus
                  className="w-28 text-sm px-2 py-1.5 border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <button onClick={handleAddMember} disabled={addingMember || !newMemberInput.trim()}
                  className="px-3 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600 transition disabled:opacity-50">
                  {addingMember ? '...' : '追加'}
                </button>
                <button onClick={() => { setShowAddMember(false); setNewMemberInput('') }}
                  className="px-2 py-1.5 text-gray-400 hover:text-gray-600 transition">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAddMember(true)}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-white text-gray-400 ring-1 ring-gray-200 hover:text-violet-500 hover:bg-violet-50 transition text-lg font-bold">
                +
              </button>
            )
          )}
        </div>
      )}

      {/* 個人タブ：年選択バー（名前選択後に表示） */}
      {tab === 'personal' && selectedName && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 items-center">
          {personalYears.map((y) => (
            <button key={y} onClick={() => setSelectedPersonalYear(y)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition
                ${selectedPersonalYear === y ? 'bg-violet-500 text-white shadow-sm' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-violet-50'}`}>
              {y}年
            </button>
          ))}
          {showAddYear ? (
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                value={newYearInput}
                onChange={(e) => setNewYearInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddYear(); if (e.key === 'Escape') { setShowAddYear(false); setNewYearInput('') } }}
                placeholder="年を入力"
                autoFocus
                className="w-24 text-sm px-2 py-1.5 border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <button onClick={handleAddYear}
                className="px-3 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600 transition">
                追加
              </button>
              <button onClick={() => { setShowAddYear(false); setNewYearInput('') }}
                className="px-2 py-1.5 text-gray-400 hover:text-gray-600 transition">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAddYear(true)}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-white text-gray-400 ring-1 ring-gray-200 hover:text-violet-500 hover:bg-violet-50 transition text-lg font-bold">
              +
            </button>
          )}
        </div>
      )}

      {/* 全体タブ：暦年選択バー */}
      {tab === 'team' && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 items-center">
          {teamYears.map((y) => (
            <button key={y} onClick={() => setSelectedYear(y)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition
                ${selectedYear === y ? 'bg-violet-500 text-white shadow-sm' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-violet-50'}`}>
              {y}年
            </button>
          ))}
          {showAddTeamYear ? (
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                value={newTeamYearInput}
                onChange={(e) => setNewTeamYearInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTeamYear(); if (e.key === 'Escape') { setShowAddTeamYear(false); setNewTeamYearInput('') } }}
                placeholder="年を入力"
                autoFocus
                className="w-24 text-sm px-2 py-1.5 border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <button onClick={handleAddTeamYear}
                className="px-3 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600 transition">
                追加
              </button>
              <button onClick={() => { setShowAddTeamYear(false); setNewTeamYearInput('') }}
                className="px-2 py-1.5 text-gray-400 hover:text-gray-600 transition">
                <X size={14} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAddTeamYear(true)}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-white text-gray-400 ring-1 ring-gray-200 hover:text-violet-500 hover:bg-violet-50 transition text-lg font-bold">
              +
            </button>
          )}
        </div>
      )}

      {/* ===== 個人タブ ===== */}
      {tab === 'personal' && (
        <>
          {/* サブタブ：一覧 / 追加 / 削除 */}
          {role === 'manager' && personalTab !== 'add' && (
            <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
              {(['view', 'delete'] as const).map((t) => (
                <button key={t} onClick={() => { setPersonalTab(t); setEditId(null) }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition
                    ${personalTab === t ? 'bg-white text-violet-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t === 'view' ? '一覧' : '削除'}
                </button>
              ))}
            </div>
          )}

          {/* 追加・編集フォーム（追加タブ） */}
          {personalTab === 'add' && role === 'manager' && (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-violet-100 mb-6 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-violet-50 border-b border-violet-100">
                <h2 className="text-sm font-bold text-violet-700">{editId !== null ? '編集' : '新規追加'}</h2>
                <button onClick={() => setPersonalTab('view')} className="text-gray-400 hover:text-gray-600 transition"><X size={18} /></button>
              </div>
              <form onSubmit={handleSave} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">名前 *</label>
                    <input type="text" value={form.name} onChange={(e) => f(e.target.value, 'name')} required
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">獲得数/月</label>
                    <input type="number" min={0} value={form.activationTarget} onChange={(e) => f(e.target.value, 'activationTarget')}
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">解除数/月</label>
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
                    <input type="month" value={form.periodStart.slice(0, 7)} onChange={(e) => f(e.target.value + '-01', 'periodStart')}
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">期間終了</label>
                    <input type="month" value={form.periodEnd.slice(0, 7)} onChange={(e) => f(e.target.value + '-01', 'periodEnd')}
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
                  <button type="button" onClick={() => setPersonalTab('view')}
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

          {/* 削除タブ */}
          {personalTab === 'delete' && role === 'manager' && (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              {records.length === 0 ? (
                <p className="text-sm text-gray-300 text-center py-12">データがありません</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {records.map((r) => (
                    <div key={r.id} className="flex items-center px-5 py-2.5">
                      <div className="w-40">
                        <span className="text-sm font-semibold text-gray-800">{r.name}</span>
                      </div>
                      <button onClick={() => handleDelete(r.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition">
                        <Trash2 size={13} />削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 一覧タブ */}
          {(personalTab === 'view' || role !== 'manager') && (
            records.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <p className="text-sm font-medium">実績データがありません</p>
              {role === 'manager' && (
                <div className="mt-4">
                  <p className="text-xs mb-3">「追加」タブから個別登録、または一括登録できます</p>
                  <button onClick={handleSeed} disabled={seeding}
                    className="px-5 py-2 bg-violet-500 text-white text-sm font-semibold rounded-xl hover:bg-violet-600 transition disabled:opacity-50">
                    {seeding ? '登録中...' : '初期データを一括登録'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.length === 0 && (
                <div className="text-center py-12 text-gray-300">
                  <p className="text-sm font-medium">{selectedFY}年度のデータがありません</p>
                </div>
              )}
              {filteredRecords.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <div>
                      <span className="text-base font-bold text-gray-800">{r.name}</span>
                    </div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex gap-4 mb-3">
                      <div className="text-center flex-1">
                        <p className="text-xs text-gray-400 mb-0.5">獲得平均/月</p>
                        <p className="text-lg font-black text-violet-600">
                          {hasMonthlyData ? memberAvg.activation : '-'}
                          {hasMonthlyData && <span className="text-xs font-normal text-gray-400 ml-0.5">件</span>}
                        </p>
                      </div>
                      <div className="w-px bg-gray-100" />
                      <div className="text-center flex-1">
                        <p className="text-xs text-gray-400 mb-0.5">解除平均/月</p>
                        <p className="text-lg font-black text-violet-600">
                          {hasMonthlyData ? memberAvg.cancel : '-'}
                          {hasMonthlyData && <span className="text-xs font-normal text-gray-400 ml-0.5">件</span>}
                        </p>
                      </div>
                      <div className="w-px bg-gray-100" />
                      <div className="text-center flex-1">
                        <p className="text-xs text-gray-400 mb-0.5">稼働日/月</p>
                        <p className="text-lg font-black text-violet-600">
                          {hasMonthlyData ? memberAvg.workDays : '-'}
                          {hasMonthlyData && <span className="text-xs font-normal text-gray-400 ml-0.5">日</span>}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-0.5">総獲得</p>
                        <p className="text-sm font-bold text-gray-700">
                          {hasMonthlyData ? <>{allMonthsTotal.activation}<span className="text-xs font-normal text-gray-400">件</span></> : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-0.5">総解除</p>
                        <p className="text-sm font-bold text-gray-700">
                          {hasMonthlyData ? <>{allMonthsTotal.cancel}<span className="text-xs font-normal text-gray-400">件</span></> : '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-0.5">解除率</p>
                        <p className="text-sm font-bold text-emerald-600">
                          {hasMonthlyData ? cancelRate(allMonthsTotal.activation, allMonthsTotal.cancel) : '-'}
                        </p>
                      </div>
                    </div>
                    {r.note && <p className="text-xs text-gray-400 mt-2">{r.note}</p>}
                  </div>
                </div>
              ))}

              {/* 月次データテーブル（名前・年選択後） */}
              {selectedName && selectedPersonalYear > 0 && (
                <div className="mt-4">
                  {/* 月別リスト */}
                  <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                    <div className="flex items-center px-4 py-2 bg-gray-50 border-b border-gray-100 gap-2">
                      <span className="text-xs font-semibold text-gray-400 w-8">月</span>
                      <div className="flex-1 grid grid-cols-5 gap-1 text-right">
                        <span className="text-xs font-semibold text-gray-400">獲得数</span>
                        <span className="text-xs font-semibold text-gray-400">解除数</span>
                        <span className="text-xs font-semibold text-gray-400">稼働日数</span>
                        <span className="text-xs font-semibold text-gray-400">解除率</span>
                        <span className="text-xs font-semibold text-gray-400">解除生産性</span>
                      </div>
                      {role === 'manager' && <div className="w-7 shrink-0" />}
                    </div>
                    <div className="divide-y divide-gray-50">
                      {filteredMemberMonthly.map((r) => {
                        const hasData = r.total_activation > 0 || r.total_cancel > 0 || r.work_days > 0
                        const isEditing = editingPersonalMonth === r.month
                        const cancelProductivity = r.work_days > 0 ? (r.total_cancel / r.work_days).toFixed(2) : '-'
                        return (
                          <div key={r.month}>
                            <div className={`flex items-center px-4 py-3 gap-2 ${!hasData && !isEditing ? 'opacity-40' : ''}`}>
                              <span className="text-sm font-semibold text-gray-700 w-8">{r.month}月</span>
                              <div className="flex-1 grid grid-cols-5 gap-1 text-right">
                                <span className="text-sm font-bold text-violet-600">
                                  {hasData ? <>{r.total_activation}<span className="text-xs font-normal text-gray-400">件</span></> : '-'}
                                </span>
                                <span className="text-sm font-bold text-violet-600">
                                  {hasData ? <>{r.total_cancel}<span className="text-xs font-normal text-gray-400">件</span></> : '-'}
                                </span>
                                <span className="text-sm font-bold text-gray-600">
                                  {hasData ? <>{r.work_days}<span className="text-xs font-normal text-gray-400">日</span></> : '-'}
                                </span>
                                <span className="text-sm font-semibold text-emerald-600">
                                  {hasData ? cancelRate(r.total_activation, r.total_cancel) : '-'}
                                </span>
                                <span className="text-sm font-semibold text-blue-600">
                                  {cancelProductivity}
                                </span>
                              </div>
                              {role === 'manager' && !isEditing && (
                                <button onClick={() => openEditPersonalMonth(r.month, r)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-violet-500 hover:bg-violet-50 transition shrink-0">
                                  <Pencil size={13} />
                                </button>
                              )}
                              {role === 'manager' && isEditing && (
                                <button onClick={() => setEditingPersonalMonth(null)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 transition shrink-0">
                                  <X size={13} />
                                </button>
                              )}
                            </div>

                            {isEditing && (
                              <form onSubmit={handleSavePersonalMonth} className="px-4 pb-4 bg-violet-50/40 space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-xs text-gray-500 mb-0.5 block">獲得数</label>
                                    <input type="number" min={0} value={personalMonthForm.totalActivation}
                                      onChange={(e) => setPersonalMonthForm((p) => ({ ...p, totalActivation: e.target.value }))}
                                      placeholder="0"
                                      className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 mb-0.5 block">解除数</label>
                                    <input type="number" min={0} value={personalMonthForm.totalCancel}
                                      onChange={(e) => setPersonalMonthForm((p) => ({ ...p, totalCancel: e.target.value }))}
                                      placeholder="0"
                                      className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500 mb-0.5 block">稼働日数</label>
                                    <input type="number" min={0} value={personalMonthForm.workDays}
                                      onChange={(e) => setPersonalMonthForm((p) => ({ ...p, workDays: e.target.value }))}
                                      placeholder="0"
                                      className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400" />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => setEditingPersonalMonth(null)}
                                    className="flex-1 py-1.5 border border-gray-200 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-50 transition">
                                    キャンセル
                                  </button>
                                  <button type="submit" disabled={savingPersonalMonth}
                                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition">
                                    <Save size={12} />{savingPersonalMonth ? '保存中...' : '保存'}
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* ===== 全体タブ ===== */}
      {tab === 'team' && (
        <>
          {teamYears.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <p className="text-sm font-medium">データがありません</p>
            </div>
          ) : (
            <>
              {/* 年間合計カード */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">{selectedYear}年 獲得計</p>
                  <p className="text-xl font-black text-violet-600">{teamTotal.activation}<span className="text-xs font-normal text-gray-400 ml-0.5">件</span></p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">{selectedYear}年 解除計</p>
                  <p className="text-xl font-black text-violet-600">{teamTotal.cancel}<span className="text-xs font-normal text-gray-400 ml-0.5">件</span></p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">解除率</p>
                  <p className="text-xl font-black text-emerald-600">{cancelRate(teamTotal.activation, teamTotal.cancel)}</p>
                </div>
              </div>

              {/* 月別リスト（1〜12月） */}
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
                <div className="flex items-center px-4 py-2 bg-gray-50 border-b border-gray-100 gap-2">
                  <span className="text-xs font-semibold text-gray-400 w-8">月</span>
                  <div className="flex-1 grid grid-cols-4 gap-1 text-right">
                    <span className="text-xs font-semibold text-gray-400">人数</span>
                    <span className="text-xs font-semibold text-gray-400">獲得数</span>
                    <span className="text-xs font-semibold text-gray-400">解除数</span>
                    <span className="text-xs font-semibold text-gray-400">解除率</span>
                  </div>
                  {role === 'manager' && <div className="w-7 shrink-0" />}
                </div>
                <div className="divide-y divide-gray-50">
                  {filteredMonthly.map((r) => {
                    const hasData = r.totalActivation > 0 || r.totalCancel > 0
                    const isEditing = editingMonth?.year === r.year && editingMonth?.month === r.month
                    return (
                      <div key={r.month}>
                        {/* 通常表示行 */}
                        <div className={`flex items-center px-4 py-3 gap-2 ${!hasData && !isEditing ? 'opacity-40' : ''}`}>
                          <span className="text-sm font-semibold text-gray-700 w-8">{r.month}月</span>
                          <div className="flex-1 grid grid-cols-4 gap-1 text-right">
                            <span className="text-xs text-gray-500">
                              {hasData && r.memberCount > 0 ? `${r.memberCount}名` : '-'}
                            </span>
                            <span className="text-sm font-bold text-violet-600">
                              {hasData ? <>{r.totalActivation}<span className="text-xs font-normal text-gray-400">件</span></> : '-'}
                            </span>
                            <span className="text-sm font-bold text-violet-600">
                              {hasData ? <>{r.totalCancel}<span className="text-xs font-normal text-gray-400">件</span></> : '-'}
                            </span>
                            <span className="text-sm font-semibold text-emerald-600">
                              {hasData ? cancelRate(r.totalActivation, r.totalCancel) : '-'}
                            </span>
                          </div>
                          {role === 'manager' && !isEditing && (
                            <button onClick={() => openEditMonth(r)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-violet-500 hover:bg-violet-50 transition shrink-0">
                              <Pencil size={13} />
                            </button>
                          )}
                          {role === 'manager' && isEditing && (
                            <button onClick={() => setEditingMonth(null)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 transition shrink-0">
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        {hasData && r.note && !isEditing && (
                          <p className="px-4 pb-2 text-xs text-gray-400">{r.note}</p>
                        )}

                        {/* 編集フォーム */}
                        {isEditing && (
                          <form onSubmit={handleSaveMonth} className="px-4 pb-4 bg-violet-50/40 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-xs text-gray-500 mb-0.5 block">獲得</label>
                                <input type="number" min={0} value={monthForm.totalActivation}
                                  onChange={(e) => setMonthForm((p) => ({ ...p, totalActivation: e.target.value }))}
                                  placeholder="0"
                                  className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-0.5 block">解除</label>
                                <input type="number" min={0} value={monthForm.totalCancel}
                                  onChange={(e) => setMonthForm((p) => ({ ...p, totalCancel: e.target.value }))}
                                  placeholder="0"
                                  className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 mb-0.5 block">人数</label>
                                <input type="number" min={0} value={monthForm.memberCount}
                                  onChange={(e) => setMonthForm((p) => ({ ...p, memberCount: e.target.value }))}
                                  placeholder="0"
                                  className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400" />
                              </div>
                            </div>
                            <input type="text" value={monthForm.note}
                              onChange={(e) => setMonthForm((p) => ({ ...p, note: e.target.value }))}
                              placeholder="メモ（任意）"
                              className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400" />
                            <div className="flex gap-2">
                              <button type="button" onClick={() => setEditingMonth(null)}
                                className="flex-1 py-1.5 border border-gray-200 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-50 transition">
                                キャンセル
                              </button>
                              <button type="submit" disabled={savingMonth}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition">
                                <Save size={12} />{savingMonth ? '保存中...' : '保存'}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
