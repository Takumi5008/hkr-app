'use client'

import { useState, useEffect, Fragment } from 'react'
import { ChevronLeft, ChevronRight, Pencil, X, Save } from 'lucide-react'

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

export default function ActivityPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [records, setRecords] = useState<DailyActivity[]>([])
  const [editingDay, setEditingDay] = useState<number | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'activity' | 'conversion'>('activity')

  useEffect(() => {
    fetch(`/api/daily-activity?year=${year}&month=${month}`)
      .then((r) => r.json()).then(setRecords)
  }, [year, month])

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

      {tab === 'conversion' && (() => {
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

      {tab === 'activity' && (
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
                <td className="border border-gray-100 px-2 py-2.5 text-center text-gray-300 text-xs">-</td>
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
                <td className="border border-gray-100 px-2 py-2.5 text-center text-gray-300 text-xs">-</td>
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
