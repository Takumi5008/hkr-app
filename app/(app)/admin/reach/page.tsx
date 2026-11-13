'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import TableScrollContainer from '@/components/TableScrollContainer'
import {
  REACH_TARGET, buildCurve, predict, statusOf, sum, effectivePlannedEnd, elapsedDays, pausedDays,
  gradeOf, reachDaysOf, type ReachGrade,
  type ReachMember, type ReachStatus, type ReachPrediction,
} from '@/lib/reach'

const GRADE_STYLE: Record<ReachGrade, string> = {
  S: 'bg-fuchsia-50 text-fuchsia-700',
  A: 'bg-emerald-50 text-emerald-700',
  B: 'bg-sky-50 text-sky-700',
  C: 'bg-gray-100 text-gray-500',
}
const GradeBadge = ({ g, prospect = false }: { g: ReachGrade; prospect?: boolean }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${GRADE_STYLE[g]} ${prospect ? 'opacity-70' : ''}`}>{g}{prospect ? '見込み' : ''}</span>
)
const ChallengerBadge = () => (
  <span className="ml-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded whitespace-nowrap">チャレンジャー</span>
)

const STATUS_LABEL: Record<ReachStatus, string> = { reached: '到達', dropped: '離脱', paused: '休止', active: '挑戦中' }
const STATUS_STYLE: Record<ReachStatus, string> = {
  reached: 'bg-emerald-50 text-emerald-700',
  dropped: 'bg-gray-100 text-gray-500',
  active: 'bg-sky-50 text-sky-700',
  paused: 'bg-amber-50 text-amber-700',
}

type Filter = 'all' | ReachStatus
type Form = {
  id: number | null; name: string; startDate: string; endDate: string; plannedEnd: string
  monthly: string; challenger: boolean; paused: boolean; pauseStart: string; resumeDate: string; grade: string; note: string
}

const emptyForm = (): Form => ({
  id: null, name: '', startDate: '', endDate: '', plannedEnd: '', monthly: '', challenger: false, paused: false, pauseStart: '', resumeDate: '', grade: '', note: '',
})

const todayJst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
const fmtDate = (d: string | null) => (d ? d.replaceAll('-', '/') : '-')
const fmtJpDate = (d: string | null) => {
  if (!d) return '-'
  const [y, m, day] = d.split('-').map(Number)
  return `${y}年${m}月${day}日`
}
// 初稼働日 + 1年 - 1日（終了予定日の既定値）
const oneYearLater = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y + 1, m - 1, day - 1)).toISOString().slice(0, 10)
}

export default function ReachPage() {
  const [role, setRole] = useState('')
  const [roleLoaded, setRoleLoaded] = useState(false)
  const [members, setMembers] = useState<ReachMember[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [rowDeleteId, setRowDeleteId] = useState<number | null>(null)
  const [rowDeleting, setRowDeleting] = useState(false)
  const [today] = useState(todayJst)

  const load = () =>
    fetch('/api/admin/reach')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { setMembers(d?.members ?? []); setLoading(false) })
      .catch(() => setLoading(false))

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { setRole(d.role ?? ''); setRoleLoaded(true) })
    load()
  }, [])

  const curve = useMemo(() => buildCurve(members), [members])
  const reachers = useMemo(() => members.filter(m => statusOf(m) === 'reached'), [members])
  const active = useMemo(() => members.filter(m => statusOf(m) === 'active'), [members])
  const predictions = useMemo(
    () => new Map(active.map(m => [m.id, predict(m, curve, reachers, today)])),
    [active, curve, reachers, today],
  )

  if (!roleLoaded) return <div className="p-6 flex items-center justify-center min-h-screen"><p className="text-gray-400">読み込み中...</p></div>
  if (role !== 'manager' && role !== 'admin') return <div className="p-6 text-center text-gray-400">このページはマネージャーのみ閲覧できます</div>

  const finished = members.filter(m => statusOf(m) === 'reached' || statusOf(m) === 'dropped')
  const pausedCount = members.filter(m => statusOf(m) === 'paused').length
  const gradeCount = { S: 0, A: 0, B: 0, C: 0 }
  finished.forEach(m => { gradeCount[gradeOf(m, today)]++ })
  const reachRate = finished.length > 0 ? Math.round((reachers.length / finished.length) * 1000) / 10 : null
  const selected = active.find(m => m.id === selectedId) ?? null
  const years = [...new Set(members.map(m => m.startDate.slice(0, 4)))].sort()
  const listed = members.filter(m => filter === 'all' || statusOf(m) === filter)

  const openEdit = (m: ReachMember) => {
    setError(''); setConfirmDelete(false)
    setForm({
      id: m.id, name: m.name, startDate: m.startDate, endDate: m.endDate ?? '', plannedEnd: m.plannedEnd ?? '',
      monthly: m.monthly.join('.'), challenger: m.challenger, paused: m.paused, pauseStart: m.pauseStart ?? '', resumeDate: m.resumeDate ?? '', grade: m.grade, note: m.note,
    })
  }
  const openNew = () => { setError(''); setConfirmDelete(false); setForm(emptyForm()) }

  const save = async () => {
    if (!form) return
    setSaving(true); setError('')
    const res = await fetch(form.id ? `/api/admin/reach/${form.id}` : '/api/admin/reach', {
      method: form.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json().catch(() => null))?.error ?? '保存に失敗しました'); return }
    setForm(null)
    load()
  }

  const remove = async () => {
    if (!form?.id) return
    setSaving(true)
    const res = await fetch(`/api/admin/reach/${form.id}`, { method: 'DELETE' })
    setSaving(false)
    if (!res.ok) { setError('削除に失敗しました'); return }
    setForm(null)
    load()
  }

  // 一覧の行から削除（確認つき）
  const removeRow = async (id: number) => {
    setRowDeleting(true)
    const res = await fetch(`/api/admin/reach/${id}`, { method: 'DELETE' })
    setRowDeleting(false)
    setRowDeleteId(null)
    if (res.ok) load()
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="bg-gradient-to-r from-teal-600 to-emerald-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-100 mb-1">Reach Tracker</p>
        <h1 className="text-2xl font-bold">{REACH_TARGET}到達管理</h1>
        <p className="text-sm text-teal-50 mt-0.5">初稼働日からの月別解除数と、未到達者の到達予測（過去の到達者データから）</p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-10">読み込み中...</p>
      ) : (
        <>
          {/* サマリー */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard label="到達者" value={`${reachers.length}人`} />
            <SummaryCard label="離脱" value={`${finished.length - reachers.length}人`} />
            <SummaryCard label="挑戦中" value={`${active.length}人`} sub={pausedCount > 0 ? `ほか休止 ${pausedCount}人（予測対象外）` : undefined} />
            <SummaryCard label="到達率" value={reachRate === null ? '-' : `${reachRate}%`} sub="終了した人のうち" />
            <SummaryCard label="評価（終了した人）" value={(['S', 'A', 'B', 'C'] as const).map(g => `${g}${gradeCount[g]}`).join(' ')} sub="S:4ヶ月以内 A:365日以内 B:365日超で到達 C:未達" />
            <SummaryCard
              label="到達までの月数"
              value={curve.monthsToReach ? `${curve.monthsToReach.avg.toFixed(1)}ヶ月` : '-'}
              sub={curve.monthsToReach ? `中央値${curve.monthsToReach.median} / 最短${curve.monthsToReach.min}・最長${curve.monthsToReach.max}` : undefined}
            />
          </div>

          {/* 挑戦中の到達予測 */}
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="font-bold text-gray-800">挑戦中メンバーの到達予測</h2>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                「経過日数」は休んだ日数を除いた日数、「終了予定日」は休んだ日数分を延長した日付です。「あと」は{REACH_TARGET}までの残り解除数、「必要ペース」は終了予定日までに届くための月平均です。到達予定日は、到達者{curve.reachers}人の月別平均解除数に、本人のペース（同じ月数時点の到達者平均との比）を掛けて先の月を予測しています。
                「今のペースなら」は1ヶ月目からの累計の推移が一番近い過去の到達者、「見込み評価」は到達予定から出した評価（S:4ヶ月以内 A:365日以内 B:365日超で到達 C:未達。日数は休止期間を除く）です。「到達者比」は同じ月数時点の累計で、到達者の何%を上回っているかです。経過2ヶ月以下は参考値です。行を押すと推移グラフを表示します。
              </p>
            </div>
            <TableScrollContainer>
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    {['名前', '初稼働日', '経過日数', '累計', 'あと', '到達予定日', '終了予定日', '判定', '必要ペース', '見込み評価', '今のペースなら', 'ペース', '到達者比'].map(h => (
                      <th key={h} className="border border-gray-100 px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {active.map(m => {
                    const p = predictions.get(m.id)!
                    return (
                      <tr key={m.id} onClick={() => setSelectedId(selectedId === m.id ? null : m.id)}
                        className={`cursor-pointer transition ${selectedId === m.id ? 'bg-teal-50' : 'odd:bg-white even:bg-gray-50/30 hover:bg-teal-50/50'}`}>
                        <td className="border border-gray-100 px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                          {m.name}
                          <ChallengerBadge />
                        </td>
                        <td className="border border-gray-100 px-3 py-2 text-center text-gray-600 whitespace-nowrap">{fmtDate(m.startDate)}</td>
                        <td className="border border-gray-100 px-3 py-2 text-center text-gray-600 whitespace-nowrap">{elapsedDays(m, today)}日<span className="text-gray-400 text-[10px] block">{p.months}ヶ月分</span></td>
                        <td className="border border-gray-100 px-3 py-2 text-center font-bold text-gray-800">{p.total}</td>
                        <td className="border border-gray-100 px-3 py-2 text-center whitespace-nowrap">
                          <span className="text-base font-bold text-rose-600">{p.remaining}</span><span className="text-gray-400 text-[10px] ml-0.5">解除</span>
                        </td>
                        <td className="border border-gray-100 px-3 py-2 text-center whitespace-nowrap">
                          {p.reachDate
                            ? <span className="font-semibold text-gray-800">{fmtJpDate(p.reachDate)}</span>
                            : <span className="text-gray-400">3年以内は困難</span>}
                          {p.months <= 2 && <span className="text-[10px] text-gray-400 block">参考値</span>}
                        </td>
                        <td className="border border-gray-100 px-3 py-2 text-center text-gray-600 whitespace-nowrap">
                          {fmtJpDate(effectivePlannedEnd(m, today))}
                          {pausedDays(m, today) > 0 && <span className="text-gray-400 text-[10px] block">休止{pausedDays(m, today)}日分延長</span>}
                        </td>
                        <td className="border border-gray-100 px-3 py-2 text-center whitespace-nowrap"><Verdict m={m} p={p} today={today} /></td>
                        <td className="border border-gray-100 px-3 py-2 text-center text-gray-600 whitespace-nowrap">
                          {p.neededPerMonth === null ? '-' : `月${p.neededPerMonth}`}
                        </td>
                        <td className="border border-gray-100 px-3 py-2 text-center"><GradeBadge g={p.grade} prospect /></td>
                        <td className="border border-gray-100 px-3 py-2 text-center whitespace-nowrap">
                          {p.similar
                            ? <><span className="font-semibold text-gray-800">{p.similar.name}</span><span className="text-gray-400"> 相当</span>
                                <span className="text-gray-400 text-[10px] block">{p.similar.reachDays}日で到達・{p.similar.grade}評価</span></>
                            : '-'}
                        </td>
                        <td className="border border-gray-100 px-3 py-2 text-center whitespace-nowrap">
                          <span className={`font-bold ${p.paceRatio >= 1 ? 'text-emerald-600' : p.paceRatio >= 0.8 ? 'text-amber-600' : 'text-rose-600'}`}>
                            ×{p.paceRatio.toFixed(2)}
                          </span>
                        </td>
                        <td className="border border-gray-100 px-3 py-2 text-center text-gray-600 whitespace-nowrap">{Math.round(p.aheadOfReachers * 100)}%を上回る</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </TableScrollContainer>
            {selected && (
              <div className="border-t border-gray-100 p-5">
                <ProjectionChart member={selected} prediction={predictions.get(selected.id)!} avgCumulative={curve.avgCumulative} />
              </div>
            )}
          </section>

          {/* 到達者の平均カーブ */}
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="font-bold text-gray-800">到達者の月別平均（予測の元データ）</h2>
              <p className="text-xs text-gray-400 mt-1">到達者が3人未満の月は、到達者の7ヶ月目以降の平均（{curve.tailAvg.toFixed(1)}）で補っています。</p>
            </div>
            <TableScrollContainer>
              <table className="text-xs border-collapse w-full">
                <tbody>
                  {[
                    { label: '月', cells: curve.avgMonthly.slice(0, 18).map((_, i) => `${i + 1}`) },
                    { label: '人数', cells: curve.avgMonthly.slice(0, 18).map((_, i) => `${reachers.filter(r => r.monthly.length > i).length}`) },
                    { label: '平均解除', cells: curve.avgMonthly.slice(0, 18).map(v => v.toFixed(1)) },
                    { label: '平均累計', cells: curve.avgCumulative.slice(0, 18).map(v => v.toFixed(1)) },
                  ].map(row => (
                    <tr key={row.label} className={row.label === '月' ? 'bg-gray-50 text-gray-600 font-semibold' : ''}>
                      <th className="border border-gray-100 px-3 py-2 text-left whitespace-nowrap bg-gray-50 text-gray-600 font-semibold">{row.label}</th>
                      {row.cells.map((c, i) => (
                        <td key={i} className="border border-gray-100 px-2.5 py-2 text-center text-gray-700">{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScrollContainer>
          </section>

          {/* 全メンバー */}
          <section className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-gray-800">全メンバー</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                  {(['all', 'active', 'paused', 'reached', 'dropped'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {f === 'all' ? '全員' : STATUS_LABEL[f]}
                    </button>
                  ))}
                </div>
                <button onClick={openNew} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition">
                  <Plus size={14} /> 追加
                </button>
              </div>
            </div>
            <TableScrollContainer>
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    {['名前', '状態', '初稼働日', '終了日', '月数', '月別解除数（1ヶ月目〜）', '累計', '残', '到達日数', '評価', 'メモ', ''].map((h, i) => (
                      <th key={i} className="border border-gray-100 px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {years.map(y => {
                    const rows = listed.filter(m => m.startDate.startsWith(y))
                    if (rows.length === 0) return null
                    return [
                      <tr key={`y${y}`}><td colSpan={12} className="border border-gray-100 px-3 py-1.5 bg-teal-50/60 text-teal-700 font-bold">{y}年スタート（{rows.length}人）</td></tr>,
                      ...rows.map(m => {
                        const st = statusOf(m)
                        const total = sum(m.monthly)
                        return (
                          <tr key={m.id} className="odd:bg-white even:bg-gray-50/30">
                            <td className="border border-gray-100 px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{m.name}{(st === 'active' || st === 'paused') && <ChallengerBadge />}</td>
                            <td className="border border-gray-100 px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUS_STYLE[st]}`}>{STATUS_LABEL[st]}</span></td>
                            <td className="border border-gray-100 px-3 py-2 text-center text-gray-600 whitespace-nowrap">{fmtDate(m.startDate)}</td>
                            <td className="border border-gray-100 px-3 py-2 text-center text-gray-600 whitespace-nowrap">
                              {m.endDate ? fmtDate(m.endDate) : <span className="text-gray-400">予定 {fmtDate(effectivePlannedEnd(m, today))}</span>}
                            </td>
                            <td className="border border-gray-100 px-3 py-2 text-center text-gray-600">{m.monthly.length}</td>
                            <td className="border border-gray-100 px-3 py-2 text-gray-600 font-mono tracking-tight min-w-48">{m.monthly.join('・')}</td>
                            <td className="border border-gray-100 px-3 py-2 text-center font-bold text-gray-800">{total}</td>
                            <td className="border border-gray-100 px-3 py-2 text-center text-gray-600">{total >= REACH_TARGET ? '-' : REACH_TARGET - total}</td>
                            <td className="border border-gray-100 px-3 py-2 text-center whitespace-nowrap">
                              {st === 'reached' ? <span className="font-semibold text-gray-800">{reachDaysOf(m, today)}日</span> : <span className="text-gray-300">-</span>}
                            </td>
                            <td className="border border-gray-100 px-3 py-2 text-center">
                              {st === 'reached' || st === 'dropped'
                                ? <GradeBadge g={gradeOf(m, today)} />
                                : st === 'active' ? <GradeBadge g={predictions.get(m.id)?.grade ?? 'C'} prospect /> : '-'}
                            </td>
                            <td className="border border-gray-100 px-3 py-2 text-gray-500 min-w-40">{m.note}</td>
                            <td className="border border-gray-100 px-2 py-2 text-center whitespace-nowrap">
                              {rowDeleteId === m.id ? (
                                <span className="inline-flex items-center gap-1">
                                  <button onClick={() => removeRow(m.id)} disabled={rowDeleting}
                                    className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-semibold disabled:opacity-50">
                                    {rowDeleting ? '削除中...' : '削除する'}
                                  </button>
                                  <button onClick={() => setRowDeleteId(null)} className="px-2 py-1 rounded-lg text-[11px] text-gray-500 hover:bg-gray-100">やめる</button>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5">
                                  <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition" aria-label={`${m.name}を編集`}>
                                    <Pencil size={14} />
                                  </button>
                                  <button onClick={() => setRowDeleteId(m.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition" aria-label={`${m.name}を削除`}>
                                    <Trash2 size={14} />
                                  </button>
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      }),
                    ]
                  })}
                </tbody>
              </table>
            </TableScrollContainer>
          </section>
        </>
      )}

      {form && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">{form.id ? 'メンバーを編集' : 'メンバーを追加'}</h3>
              <button onClick={() => setForm(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <Field label="名前">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="初稼働日">
              <input type="date" value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value, plannedEnd: form.plannedEnd || (e.target.value ? oneYearLater(e.target.value) : '') })}
                className={inputCls} />
            </Field>
            <Field label="月別解除数" hint="1ヶ月目から順に「2.5.8」のように区切って入力">
              <input value={form.monthly} onChange={e => setForm({ ...form, monthly: e.target.value })} placeholder="2.5.8.7" className={inputCls} inputMode="decimal" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="終了予定日" hint="休止分は自動で延長">
                <input type="date" value={form.plannedEnd} onChange={e => setForm({ ...form, plannedEnd: e.target.value })} className={inputCls} />
              </Field>
              <Field label="終了日" hint="到達・離脱したら入力">
                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.paused} onChange={e => setForm({ ...form, paused: e.target.checked })} className="w-4 h-4 accent-amber-500" />
              稼働停止・休止中<span className="text-[10px] text-gray-400">（予測の対象から外します）</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="休止開始日">
                <input type="date" value={form.pauseStart} onChange={e => setForm({ ...form, pauseStart: e.target.value })} className={inputCls} />
              </Field>
              <Field label="再開日">
                <input type="date" value={form.resumeDate} onChange={e => setForm({ ...form, resumeDate: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <p className="text-[10px] text-gray-400 -mt-1">休止期間は経過日数に数えず、その日数分だけ終了予定日・到達予定日を延ばします。</p>
            <Field label="評価" hint="自動＝到達日数から判定（S:4ヶ月以内 A:365日以内 B:365日超 C:未達）">
              <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} className={inputCls}>
                <option value="">自動</option>
                {(['S', 'A', 'B', 'C'] as const).map(g => <option key={g} value={g}>{g}（手動で指定）</option>)}
              </select>
            </Field>
            <Field label="メモ">
              <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} className={inputCls} />
            </Field>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="flex items-center justify-between gap-2 pt-1">
              {form.id ? (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <button onClick={remove} disabled={saving} className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold disabled:opacity-50">削除する</button>
                    <button onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-xl text-xs text-gray-500">やめる</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-rose-500 hover:bg-rose-50">
                    <Trash2 size={14} /> 削除
                  </button>
                )
              ) : <span />}
              <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-gray-600">{label}</span>
      {hint && <span className="text-[10px] text-gray-400 ml-1.5">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 px-4 py-3">
      <p className="text-[11px] font-semibold text-gray-400">{label}</p>
      <p className="text-xl font-bold text-gray-800 mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{sub}</p>}
    </div>
  )
}

function Verdict({ m, p, today }: { m: ReachMember; p: ReachPrediction; today: string }) {
  const planned = effectivePlannedEnd(m, today)
  if (planned && planned < today) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600">期限超過</span>
  if (p.withinPlan === true) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">期限内見込み</span>
  if (p.withinPlan === false) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">期限後見込み</span>
  return <span className="text-gray-400">-</span>
}

// 実績（実線）・予測（点線）・到達者平均（灰色）の累計推移
function ProjectionChart({ member, prediction, avgCumulative }: { member: ReachMember; prediction: ReachPrediction; avgCumulative: number[] }) {
  const months = Math.min(24, Math.max(13, (prediction.reachMonth ?? 24) + 1))
  const W = 640, H = 220, L = 32, R = 12, T = 12, B = 24
  const maxY = Math.max(REACH_TARGET + 10, ...prediction.projection.slice(0, months), ...avgCumulative.slice(0, months))
  const x = (i: number) => L + ((W - L - R) * i) / months
  const y = (v: number) => T + (H - T - B) * (1 - v / maxY)
  const path = (vals: number[], from = 0) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(from + i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  const actual = [0, ...prediction.projection.slice(0, prediction.months)]
  const future = [actual.at(-1)!, ...prediction.projection.slice(prediction.months, months)]
  const avg = [0, ...avgCumulative.slice(0, months)]
  const planMonth = member.plannedEnd ? 12 : null

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
        <span className="font-bold text-gray-800 text-sm">{member.name} の累計推移</span>
        <span className="flex items-center gap-1"><i className="w-4 h-0.5 bg-teal-600 inline-block" />実績</span>
        <span className="flex items-center gap-1"><i className="w-4 h-0.5 border-t-2 border-dashed border-teal-500 inline-block" />予測</span>
        <span className="flex items-center gap-1"><i className="w-4 h-0.5 bg-gray-300 inline-block" />到達者平均</span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[480px]" role="img" aria-label={`${member.name}の累計解除数の推移`}>
          {[0, 20, 40, 60, REACH_TARGET].map(v => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === REACH_TARGET ? '#f43f5e' : '#f1f5f9'} strokeDasharray={v === REACH_TARGET ? '4 3' : undefined} />
              <text x={L - 4} y={y(v) + 3} textAnchor="end" fontSize="9" fill={v === REACH_TARGET ? '#f43f5e' : '#94a3b8'}>{v}</text>
            </g>
          ))}
          {Array.from({ length: months + 1 }, (_, i) => i).filter(i => i % 3 === 0).map(i => (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">{i}ヶ月</text>
          ))}
          {planMonth && planMonth <= months && (
            <line x1={x(planMonth)} x2={x(planMonth)} y1={T} y2={H - B} stroke="#f59e0b" strokeDasharray="2 3" />
          )}
          <path d={path(avg)} fill="none" stroke="#cbd5e1" strokeWidth="2" />
          <path d={path(future, prediction.months)} fill="none" stroke="#14b8a6" strokeWidth="2" strokeDasharray="5 4" />
          <path d={path(actual)} fill="none" stroke="#0d9488" strokeWidth="2.5" />
        </svg>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">赤の点線が{REACH_TARGET}、オレンジの縦線が1年（終了予定日の目安）です。</p>
    </div>
  )
}
