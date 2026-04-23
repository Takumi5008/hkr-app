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
  const [selectedFY, setSelectedFY] = useState<number>(0)   // 個人タブ用年度
  const [selectedYear, setSelectedYear] = useState<number>(0) // 全体タブ用暦年
  const [tab, setTab] = useState<'personal' | 'team'>('personal')

  useEffect(() => {
    fetch('/api/performance').then((r) => r.json()).then((rows: MemberPerformance[]) => {
      setRecords(rows)
      if (rows.length > 0) {
        const years = rows.map((r) => fiscalYear(r.period_start)).filter(Boolean)
        setSelectedFY(Math.max(...years))
      }
    })
    fetch('/api/performance/monthly').then((r) => r.json()).then((rows: MonthlyRecord[]) => {
      setMonthly(rows)
      if (rows.length > 0) {
        setSelectedYear(Math.max(...rows.map((r) => r.year)))
      }
    })
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setRole(d.role ?? 'member'))
  }, [])

  // 個人タブ用年度一覧（降順）
  const personalFYs = [...new Set(records.map((r) => fiscalYear(r.period_start)).filter(Boolean))].sort((a, b) => b - a)

  // 全体タブ用暦年一覧（降順）
  const teamYears = [...new Set(monthly.map((r) => r.year))].sort((a, b) => b - a)

  // 年度フィルタ後の個人レコード
  const filteredRecords = selectedFY
    ? records.filter((r) => fiscalYear(r.period_start) === selectedFY)
    : records

  // 暦年フィルタ後の月次レコード（1〜12月の順）
  const filteredMonthly = (() => {
    // 選択年の1〜12月をすべて並べ、データがない月は 0 で埋める
    const dataMap = new Map(
      monthly.filter((r) => r.year === selectedYear).map((r) => [r.month, r])
    )
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      return dataMap.get(m) ?? { year: selectedYear, month: m, totalActivation: 0, totalCancel: 0 }
    })
  })()

  // 全体タブの年間合計（データがある月のみ）
  const teamTotal = monthly
    .filter((r) => r.year === selectedYear)
    .reduce(
      (acc, r) => ({ activation: acc.activation + r.totalActivation, cancel: acc.cancel + r.totalCancel }),
      { activation: 0, cancel: 0 }
    )

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

  const openAdd = () => { setEditId(null); setForm({ ...emptyForm }); setShowForm(true) }

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
    setSaving(false); setShowForm(false); setEditId(null)
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

      {/* 年度／暦年選択バー */}
      {tab === 'personal' && personalFYs.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {personalFYs.map((fy) => (
            <button key={fy} onClick={() => setSelectedFY(fy)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition
                ${selectedFY === fy ? 'bg-violet-500 text-white shadow-sm' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-violet-50'}`}>
              {fy}年度
            </button>
          ))}
        </div>
      )}
      {tab === 'team' && teamYears.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {teamYears.map((y) => (
            <button key={y} onClick={() => setSelectedYear(y)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition
                ${selectedYear === y ? 'bg-violet-500 text-white shadow-sm' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-violet-50'}`}>
              {y}年
            </button>
          ))}
        </div>
      )}

      {/* ===== 個人タブ ===== */}
      {tab === 'personal' && (
        <>
          {role === 'manager' && (
            <div className="flex justify-end mb-4">
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white text-sm font-semibold rounded-xl hover:bg-violet-600 transition shadow-sm">
                <Plus size={15} />追加
              </button>
            </div>
          )}

          {/* 追加・編集フォーム */}
          {showForm && role === 'manager' && (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-violet-100 mb-6 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-violet-50 border-b border-violet-100">
                <h2 className="text-sm font-bold text-violet-700">{editId !== null ? '編集' : '新規追加'}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={18} /></button>
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

          {records.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <p className="text-sm font-medium">実績データがありません</p>
              {role === 'manager' && (
                <div className="mt-4">
                  <p className="text-xs mb-3">「追加」ボタンから個別登録、または一括登録できます</p>
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
                      {(r.period_start || r.period_end) && (
                        <span className="ml-3 text-xs text-gray-400">
                          {r.period_start && r.period_end ? `${r.period_start} 〜 ${r.period_end}` : r.period_start || r.period_end}
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
                    <div className="flex gap-4 mb-3">
                      <div className="text-center flex-1">
                        <p className="text-xs text-gray-400 mb-0.5">獲得平均/月</p>
                        <p className="text-lg font-black text-violet-600">
                          {r.total_activation === 0 ? 0 : Math.round(r.total_activation / periodMonths(r))}
                          <span className="text-xs font-normal text-gray-400 ml-0.5">件</span>
                        </p>
                      </div>
                      <div className="w-px bg-gray-100" />
                      <div className="text-center flex-1">
                        <p className="text-xs text-gray-400 mb-0.5">解除平均/月</p>
                        <p className="text-lg font-black text-violet-600">
                          {r.total_cancel === 0 ? 0 : Math.round(r.total_cancel / periodMonths(r))}
                          <span className="text-xs font-normal text-gray-400 ml-0.5">件</span>
                        </p>
                      </div>
                      <div className="w-px bg-gray-100" />
                      <div className="text-center flex-1">
                        <p className="text-xs text-gray-400 mb-0.5">稼働日/月</p>
                        <p className="text-lg font-black text-violet-600">{r.work_days_target}<span className="text-xs font-normal text-gray-400 ml-0.5">日</span></p>
                      </div>
                    </div>
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
                        <p className="text-sm font-bold text-emerald-600">{cancelRate(r.total_activation, r.total_cancel)}</p>
                      </div>
                    </div>
                    {r.note && <p className="text-xs text-gray-400 mt-2">{r.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== 全体タブ ===== */}
      {tab === 'team' && (
        <>
          {teamYears.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <p className="text-sm font-medium">データがありません</p>
              <p className="text-xs mt-1">HKR入力でデータを登録すると反映されます</p>
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
                <div className="grid grid-cols-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400">
                  <span>月</span>
                  <span className="text-right">獲得</span>
                  <span className="text-right">解除</span>
                  <span className="text-right">解除率</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {filteredMonthly.map((r) => {
                    const hasData = r.totalActivation > 0 || r.totalCancel > 0
                    return (
                      <div key={r.month} className={`grid grid-cols-4 items-center px-4 py-3 ${!hasData ? 'opacity-30' : ''}`}>
                        <span className="text-sm font-semibold text-gray-700">{r.month}月</span>
                        <span className="text-right text-sm font-bold text-violet-600">
                          {hasData ? <>{r.totalActivation}<span className="text-xs font-normal text-gray-400 ml-0.5">件</span></> : '-'}
                        </span>
                        <span className="text-right text-sm font-bold text-violet-600">
                          {hasData ? <>{r.totalCancel}<span className="text-xs font-normal text-gray-400 ml-0.5">件</span></> : '-'}
                        </span>
                        <span className="text-right text-sm font-semibold text-emerald-600">
                          {hasData ? cancelRate(r.totalActivation, r.totalCancel) : '-'}
                        </span>
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
