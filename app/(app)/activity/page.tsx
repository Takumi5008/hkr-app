'use client'

import { useState, useEffect, Fragment } from 'react'
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Pencil, X, Save } from 'lucide-react'

type DailyActivity = {
  id: number
  user_id: number
  date: string
  work_hours: string
  pin_count: number
  pingpong_count: number
  intercom_count: number
  face_other: number
  face_unused: number
  hearing_sheet: number
  consent_form: number
  wimax: number
  sonet: number
  cancel: number
}

const emptyForm = {
  workHours: '',
  pinCount: '',
  pingpongCount: '',
  intercomCount: '',
  faceOther: '',
  faceUnused: '',
  hearingSheet: '',
  consentForm: '',
  wimax: '',
  sonet: '',
  cancel: '',
}

const COLS = [
  { key: 'work_hours',      label: '稼働時間',  formKey: 'workHours',      type: 'text' },
  { key: 'pin_count',       label: 'ピン数',    formKey: 'pinCount',       type: 'number' },
  { key: 'pingpong_count',  label: 'PP数',      formKey: 'pingpongCount',  type: 'number' },
  { key: 'intercom_count',  label: 'IH突破',    formKey: 'intercomCount',  type: 'number' },
  { key: 'face_other',      label: '対面(他)',  formKey: 'faceOther',      type: 'number' },
  { key: 'face_unused',     label: '対面(未)',  formKey: 'faceUnused',     type: 'number' },
  { key: 'hearing_sheet',   label: 'HS',        formKey: 'hearingSheet',   type: 'number' },
  { key: 'consent_form',    label: '同意書',    formKey: 'consentForm',    type: 'number' },
  { key: 'wimax',           label: 'WiMAX',     formKey: 'wimax',          type: 'number' },
  { key: 'sonet',           label: 'So-net',    formKey: 'sonet',          type: 'number' },
  { key: 'cancel',          label: '解除',      formKey: 'cancel',         type: 'number' },
] as const

type User = { id: number; name: string; role: string }

export default function ActivityPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [records, setRecords] = useState<DailyActivity[]>([])
  const [editingDay, setEditingDay] = useState<number | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'activity' | 'conversion'>('activity')
  const [myRole, setMyRole] = useState<string>('')
  const [members, setMembers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null | 'all'>(null)

  type AllMemberRow = {
    user_id: number; name: string; work_days: number; work_hours: number
    pin_count: number; pingpong_count: number; intercom_count: number
    face_other: number; face_unused: number; hearing_sheet: number
    consent_form: number; wimax: number; sonet: number; cancel: number
  }
  const [allData, setAllData] = useState<AllMemberRow[]>([])

  const moveRow = async (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= allData.length) return
    const a = allData[index], b = allData[next]
    const newData = [...allData]
    newData[index] = { ...b }
    newData[next] = { ...a }
    setAllData(newData)
    await Promise.all([
      fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.user_id, display_order: next }) }),
      fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.user_id, display_order: index }) }),
    ])
  }

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

  useEffect(() => {
    if (selectedUserId === 'all') {
      fetch(`/api/daily-activity?year=${year}&month=${month}&userId=all`)
        .then((r) => r.json()).then((d) => { if (Array.isArray(d)) setAllData(d) })
    } else {
      const userParam = selectedUserId ? `&userId=${selectedUserId}` : ''
      fetch(`/api/daily-activity?year=${year}&month=${month}${userParam}`)
        .then((r) => r.json()).then(setRecords)
    }
  }, [year, month, selectedUserId])

  const prevMonth = () => { if (month === 1) { setYear((y) => y - 1); setMonth(12) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear((y) => y + 1); setMonth(1) } else setMonth((m) => m + 1) }

  const daysInMonth = new Date(year, month, 0).getDate()
  const dataMap = new Map(records.map((r) => [parseInt(r.date.slice(8, 10)), r]))

  const openEdit = (day: number) => {
    const rec = dataMap.get(day)
    setEditingDay(day)
    setForm({
      workHours:     rec?.work_hours ?? '',
      pinCount:      rec?.pin_count      ? String(rec.pin_count)      : '',
      pingpongCount: rec?.pingpong_count ? String(rec.pingpong_count) : '',
      intercomCount: rec?.intercom_count ? String(rec.intercom_count) : '',
      faceOther:     rec?.face_other     ? String(rec.face_other)     : '',
      faceUnused:    rec?.face_unused    ? String(rec.face_unused)    : '',
      hearingSheet:  rec?.hearing_sheet  ? String(rec.hearing_sheet)  : '',
      consentForm:   rec?.consent_form   ? String(rec.consent_form)   : '',
      wimax:         rec?.wimax          ? String(rec.wimax)          : '',
      sonet:         rec?.sonet          ? String(rec.sonet)          : '',
      cancel:        rec?.cancel         ? String(rec.cancel)         : '',
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDay) return
    setSaving(true)
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(editingDay).padStart(2, '0')}`
    const res = await fetch('/api/daily-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: dateStr,
        workHours:     form.workHours,
        pinCount:      parseInt(form.pinCount)      || 0,
        pingpongCount: parseInt(form.pingpongCount) || 0,
        intercomCount: parseInt(form.intercomCount) || 0,
        faceOther:     parseInt(form.faceOther)     || 0,
        faceUnused:    parseInt(form.faceUnused)    || 0,
        hearingSheet:  parseInt(form.hearingSheet)  || 0,
        consentForm:   parseInt(form.consentForm)   || 0,
        wimax:         parseInt(form.wimax)         || 0,
        sonet:         parseInt(form.sonet)         || 0,
        cancel:        parseInt(form.cancel)        || 0,
      }),
    })
    if (res.ok) setRecords(await res.json())
    setSaving(false)
    setEditingDay(null)
  }

  const f = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  const daysWithData = records.filter((r) => r.work_hours !== '').length

  const totalWorkHours = Math.round(records.reduce((s, r) => s + (parseFloat(r.work_hours) || 0), 0) * 10) / 10
  const avgWorkHours = daysWithData > 0 ? Math.round(totalWorkHours / daysWithData * 10) / 10 : 0

  const totals = {
    pin_count:      records.reduce((s, r) => s + r.pin_count, 0),
    pingpong_count: records.reduce((s, r) => s + r.pingpong_count, 0),
    intercom_count: records.reduce((s, r) => s + r.intercom_count, 0),
    face_other:     records.reduce((s, r) => s + r.face_other, 0),
    face_unused:    records.reduce((s, r) => s + r.face_unused, 0),
    hearing_sheet:  records.reduce((s, r) => s + r.hearing_sheet, 0),
    consent_form:   records.reduce((s, r) => s + r.consent_form, 0),
    wimax:          records.reduce((s, r) => s + r.wimax, 0),
    sonet:          records.reduce((s, r) => s + r.sonet, 0),
    cancel:         records.reduce((s, r) => s + r.cancel, 0),
  }

  const cell = (val: number | string | undefined) =>
    val === undefined || val === 0 || val === '' ? (
      <span className="text-gray-200">-</span>
    ) : (
      <span className="text-gray-700 font-medium">{val}</span>
    )

  const totalCell = (val: number) =>
    val === 0 ? <span className="text-gray-300">-</span> : <span className="text-teal-700 font-bold">{val}</span>

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-teal-600 to-emerald-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-200 mb-1">Activity</p>
        <h1 className="text-2xl font-bold">行動表</h1>
        <p className="text-sm text-teal-100 mt-0.5">日別の行動記録</p>
      </div>

      {/* 管理者：メンバー選択 */}
      {(myRole === 'manager' || myRole === 'viewer') && members.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-500 shrink-0">メンバー</span>
          <select
            value={selectedUserId ?? ''}
            onChange={(e) => {
              const v = e.target.value
              setSelectedUserId(v === 'all' ? 'all' : v ? Number(v) : null)
            }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
          >
            <option value="">自分</option>
            <option value="all">全員</option>
            {members.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-2 mb-5">
        {(['activity', 'conversion'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-teal-500 text-white shadow' : 'bg-white text-gray-500 hover:bg-teal-50 shadow-sm'
            }`}
          >
            {t === 'activity' ? '行動表' : '転換率'}
          </button>
        ))}
      </div>

      {/* 月選択 */}
      <div className="flex items-center justify-center gap-4 mb-5">
        <button onClick={prevMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-teal-50 text-teal-500 font-bold transition flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <span className="text-xl font-bold text-gray-800 min-w-32 text-center">{year}年 {month}月</span>
        <button onClick={nextMonth} className="w-9 h-9 rounded-full bg-white shadow hover:bg-teal-50 text-teal-500 font-bold transition flex items-center justify-center">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ===== 全員サマリーテーブル ===== */}
      {selectedUserId === 'all' && (() => {
        const ALL_COLS = [
          { label: '稼働日数',        key: 'work_days' as const },
          { label: '稼働時間',        key: 'work_hours' as const },
          { label: 'ピン数',          key: 'pin_count' as const },
          { label: 'PP数',            key: 'pingpong_count' as const },
          { label: 'IH突破',          key: 'intercom_count' as const },
          { label: '対面(他)',        key: 'face_other' as const },
          { label: '対面(未)',        key: 'face_unused' as const },
          { label: 'HS',             key: 'hearing_sheet' as const },
          { label: '同意書',          key: 'consent_form' as const },
          { label: '件数',            key: '_total' as const },
          { label: 'WiMAX',          key: 'wimax' as const },
          { label: 'So-net',         key: 'sonet' as const },
          { label: '解除',            key: 'cancel' as const },
          { label: '生産性',          key: '_productivity' as const },
          { label: 'PP→対面',         key: '_r_pp_face' as const },
          { label: '対面→HS',         key: '_r_face_hs' as const },
          { label: 'HS→同意書',       key: '_r_hs_consent' as const },
          { label: '同意書→件数',     key: '_r_consent_total' as const },
        ] as const

        const fmt = (v: number | string) => (v === 0 || v === '' || v === '-') ? <span className="text-gray-200">-</span> : <span>{v}</span>

        const totals = allData.reduce((acc, r) => ({
          work_days: acc.work_days + r.work_days,
          work_hours: Math.round((acc.work_hours + r.work_hours) * 10) / 10,
          pin_count: acc.pin_count + r.pin_count,
          pingpong_count: acc.pingpong_count + r.pingpong_count,
          intercom_count: acc.intercom_count + r.intercom_count,
          face_other: acc.face_other + r.face_other,
          face_unused: acc.face_unused + r.face_unused,
          hearing_sheet: acc.hearing_sheet + r.hearing_sheet,
          consent_form: acc.consent_form + r.consent_form,
          wimax: acc.wimax + r.wimax,
          sonet: acc.sonet + r.sonet,
          cancel: acc.cancel + r.cancel,
        }), { work_days:0, work_hours:0, pin_count:0, pingpong_count:0, intercom_count:0, face_other:0, face_unused:0, hearing_sheet:0, consent_form:0, wimax:0, sonet:0, cancel:0 })

        const pct = (num: number, den: number) =>
          den > 0 ? `${Math.round(num / den * 1000) / 10}%` : '-'

        const getCell = (r: typeof allData[0], key: typeof ALL_COLS[number]['key']): number | string => {
          if (key === '_total') return r.wimax + r.sonet
          if (key === '_productivity') {
            if (r.work_days === 0) return '-'
            return Math.round((r.wimax + r.sonet) / r.work_days * 100) / 100
          }
          const face = r.face_other + r.face_unused
          if (key === '_r_pp_face')       return pct(face, r.pingpong_count)
          if (key === '_r_face_hs')       return pct(r.hearing_sheet, face)
          if (key === '_r_hs_consent')    return pct(r.consent_form, r.hearing_sheet)
          if (key === '_r_consent_total') return pct(r.wimax + r.sonet, r.consent_form)
          return r[key]
        }

        return (
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr>
                    <th className="border border-gray-100 px-3 py-2.5 bg-gray-50 text-left sticky left-0 z-10 text-gray-600 font-semibold whitespace-nowrap">名前</th>
                    {ALL_COLS.map((c) => (
                      <th key={c.label} className="border border-gray-100 px-2 py-2.5 bg-gray-50 text-center text-gray-600 font-semibold whitespace-nowrap">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allData.map((r, i) => (
                    <tr key={r.user_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                      <td className="border border-gray-100 px-2 py-2 font-semibold text-gray-800 sticky left-0 bg-inherit whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {myRole === 'manager' && (
                            <div className="flex flex-col shrink-0">
                              <button onClick={() => moveRow(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-teal-500 disabled:opacity-0 transition leading-none"><ChevronUp size={12} /></button>
                              <button onClick={() => moveRow(i, 1)} disabled={i === allData.length - 1} className="text-gray-300 hover:text-teal-500 disabled:opacity-0 transition leading-none"><ChevronDown size={12} /></button>
                            </div>
                          )}
                          {r.name}
                        </div>
                      </td>
                      {ALL_COLS.map((c) => (
                        <td key={c.label} className="border border-gray-100 px-2 py-2 text-center">
                          {fmt(getCell(r, c.key))}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* 合計行 */}
                  <tr className="bg-teal-50/60">
                    <td className="border border-gray-100 px-3 py-2.5 font-bold text-teal-700 sticky left-0 bg-teal-50/60">合計</td>
                    {ALL_COLS.map((c) => {
                      let v: number | string = 0
                      if (c.key === '_total') v = totals.wimax + totals.sonet
                      else if (c.key === '_productivity') v = totals.work_days > 0 ? Math.round((totals.wimax + totals.sonet) / totals.work_days * 100) / 100 : '-'
                      else if (c.key === '_r_pp_face')       v = pct(totals.face_other + totals.face_unused, totals.pingpong_count)
                      else if (c.key === '_r_face_hs')       v = pct(totals.hearing_sheet, totals.face_other + totals.face_unused)
                      else if (c.key === '_r_hs_consent')    v = pct(totals.consent_form, totals.hearing_sheet)
                      else if (c.key === '_r_consent_total') v = pct(totals.wimax + totals.sonet, totals.consent_form)
                      else v = totals[c.key as keyof typeof totals]
                      return (
                        <td key={c.label} className="border border-gray-100 px-2 py-2.5 text-center font-bold text-teal-700">
                          {v === 0 || v === '-' ? <span className="text-gray-300 font-normal">-</span> : v}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {selectedUserId !== 'all' && tab === 'conversion' && (() => {
        const face = totals.face_other + totals.face_unused
        const ratio = (num: number, den: number) =>
          den > 0 ? `${Math.round(num / den * 1000) / 10}%` : '-'
        const convItems = [
          { label: 'ピンポン数 → 対面', value: ratio(face, totals.pingpong_count) },
          { label: '対面 → シート',     value: ratio(totals.hearing_sheet, face) },
          { label: 'シート → 同意書',   value: ratio(totals.consent_form, totals.hearing_sheet) },
          { label: '同意書 → 件数',     value: ratio(totals.wimax + totals.sonet, totals.consent_form) },
        ]
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {convItems.map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-5 flex flex-col items-center gap-2">
                <p className="text-xs text-gray-500 text-center">{label}</p>
                <p className="text-2xl font-bold text-teal-600">{value}</p>
              </div>
            ))}
          </div>
        )
      })()}

      {selectedUserId !== 'all' && tab === 'activity' && (
      <>{/* テーブル */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse" style={{ minWidth: '700px', width: '100%' }}>
            <thead>
              <tr>
                <th className="border border-gray-100 px-2 py-2.5 bg-gray-50 text-center sticky left-0 z-10 text-gray-600 font-semibold w-8">日</th>
                {COLS.map((c) => (
                  <th key={c.key} className="border border-gray-100 px-2 py-2.5 bg-gray-50 text-center text-gray-600 font-semibold whitespace-nowrap">{c.label}</th>
                ))}
                <th className="border border-gray-100 px-1 py-2.5 bg-gray-50 w-7" />
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const rec = dataMap.get(day)
                const hasData = rec && (rec.work_hours || rec.pin_count || rec.pingpong_count || rec.intercom_count ||
                  rec.face_other || rec.face_unused || rec.hearing_sheet || rec.consent_form || rec.wimax || rec.sonet || rec.cancel)
                const isEditing = editingDay === day
                const dow = new Date(year, month - 1, day).getDay()
                const isToday = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()
                return (
                  <Fragment key={day}>
                    <tr className={`${!hasData ? 'opacity-40' : ''} ${day % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}>
                      <td className={`border border-gray-100 px-2 py-2 text-center font-bold sticky left-0 z-10 bg-inherit
                        ${isToday ? 'bg-teal-500 !text-white' : dow === 0 ? 'text-rose-500' : dow === 6 ? 'text-indigo-500' : 'text-gray-700'}`}>
                        {day}
                      </td>
                      <td className="border border-gray-100 px-2 py-2 text-center">{cell(rec?.work_hours)}</td>
                      <td className="border border-gray-100 px-2 py-2 text-center">{cell(rec?.pin_count)}</td>
                      <td className="border border-gray-100 px-2 py-2 text-center">{cell(rec?.pingpong_count)}</td>
                      <td className="border border-gray-100 px-2 py-2 text-center">{cell(rec?.intercom_count)}</td>
                      <td className="border border-gray-100 px-2 py-2 text-center">{cell(rec?.face_other)}</td>
                      <td className="border border-gray-100 px-2 py-2 text-center">{cell(rec?.face_unused)}</td>
                      <td className="border border-gray-100 px-2 py-2 text-center">{cell(rec?.hearing_sheet)}</td>
                      <td className="border border-gray-100 px-2 py-2 text-center">{cell(rec?.consent_form)}</td>
                      <td className="border border-gray-100 px-2 py-2 text-center">{cell(rec?.wimax)}</td>
                      <td className="border border-gray-100 px-2 py-2 text-center">{cell(rec?.sonet)}</td>
                      <td className="border border-gray-100 px-2 py-2 text-center">{cell(rec?.cancel)}</td>
                      <td className="border border-gray-100 px-1 py-2 text-center">
                        {isEditing ? (
                          <button onClick={() => setEditingDay(null)} className="text-gray-300 hover:text-gray-500 transition">
                            <X size={13} />
                          </button>
                        ) : (
                          <button onClick={() => openEdit(day)} className="text-gray-300 hover:text-teal-500 transition">
                            <Pencil size={13} />
                          </button>
                        )}
                      </td>
                    </tr>

                    {isEditing && (
                      <tr>
                        <td colSpan={13} className="border border-gray-100 p-3 bg-teal-50/40">
                          <form onSubmit={handleSave} className="space-y-2">
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {COLS.map((c) => (
                                <div key={c.key}>
                                  <label className="text-xs text-gray-500 mb-0.5 block">{c.label}</label>
                                  <input
                                    type={c.type}
                                    min={c.type === 'number' ? 0 : undefined}
                                    value={form[c.formKey as keyof typeof emptyForm]}
                                    onChange={f(c.formKey as keyof typeof emptyForm)}
                                    placeholder={c.type === 'number' ? '0' : '例: 8.5'}
                                    className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button type="button" onClick={() => setEditingDay(null)}
                                className="flex-1 py-1.5 border border-gray-200 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-50 transition">
                                キャンセル
                              </button>
                              <button type="submit" disabled={saving}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-teal-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition">
                                <Save size={12} />{saving ? '保存中...' : '保存'}
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}

              {/* 合計行 */}
              <tr className="bg-teal-50/60">
                <td className="border border-gray-100 px-2 py-2.5 text-center font-bold text-teal-700 sticky left-0 bg-teal-50/60">合計</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(totalWorkHours)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(totals.pin_count)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(totals.pingpong_count)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(totals.intercom_count)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(totals.face_other)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(totals.face_unused)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(totals.hearing_sheet)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(totals.consent_form)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(totals.wimax)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(totals.sonet)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(totals.cancel)}</td>
                <td className="border border-gray-100" />
              </tr>

              {/* 平均行 */}
              <tr className="bg-indigo-50/40">
                <td className="border border-gray-100 px-2 py-2.5 text-center font-bold text-indigo-600 sticky left-0 bg-indigo-50/40">平均</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(avgWorkHours)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(daysWithData > 0 ? Math.round(totals.pin_count / daysWithData * 10) / 10 : 0)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(daysWithData > 0 ? Math.round(totals.pingpong_count / daysWithData * 10) / 10 : 0)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(daysWithData > 0 ? Math.round(totals.intercom_count / daysWithData * 10) / 10 : 0)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(daysWithData > 0 ? Math.round(totals.face_other / daysWithData * 10) / 10 : 0)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(daysWithData > 0 ? Math.round(totals.face_unused / daysWithData * 10) / 10 : 0)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(daysWithData > 0 ? Math.round(totals.hearing_sheet / daysWithData * 10) / 10 : 0)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(daysWithData > 0 ? Math.round(totals.consent_form / daysWithData * 10) / 10 : 0)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(daysWithData > 0 ? Math.round(totals.wimax / daysWithData * 10) / 10 : 0)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(daysWithData > 0 ? Math.round(totals.sonet / daysWithData * 10) / 10 : 0)}</td>
                <td className="border border-gray-100 px-2 py-2.5 text-center text-xs">{totalCell(daysWithData > 0 ? Math.round(totals.cancel / daysWithData * 10) / 10 : 0)}</td>
                <td className="border border-gray-100" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </>)}
    </div>
  )
}
