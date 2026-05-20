'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, ClipboardList, ChevronDown, ChevronUp, Loader2, Settings, Trash2 } from 'lucide-react'

function getReviewPeriod(year: number, month: number) {
  const dow = new Date(year, month - 1, 1).getDay()
  // 第一金曜日を計算 (0=日,5=金)
  const daysToFriday = (5 - dow + 7) % 7
  const firstFriday = 1 + daysToFriday
  return {
    openDate: new Date(year, month - 1, 1, 0, 0, 0),
    closeDate: new Date(year, month - 1, firstFriday, 20, 0, 0),
    firstFriday,
  }
}

function getTargetMonth() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 }
}

function fmt(y: number, m: number) {
  return `${y}年${m}月`
}

const SCORE_OPTIONS = ['達成', 'ほぼ達成', '未達'] as const
type Score = typeof SCORE_OPTIONS[number]

const SCORE_COLOR: Record<Score, string> = {
  '達成': 'bg-green-500 text-white border-green-500',
  'ほぼ達成': 'bg-yellow-400 text-white border-yellow-400',
  '未達': 'bg-red-500 text-white border-red-500',
}
const SCORE_IDLE = 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'

export default function ReviewPage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const { firstFriday } = getReviewPeriod(currentYear, currentMonth)
  const target = getTargetMonth()

  const [myRole, setMyRole] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [existing, setExisting] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)

  // 受付期間（DBから取得。なければデフォルトの第一金曜20時）
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null)
  const [deadlineInput, setDeadlineInput] = useState('')
  const [deadlineSaved, setDeadlineSaved] = useState(false)

  const closeDate = deadlineAt ? new Date(deadlineAt) : getReviewPeriod(currentYear, currentMonth).closeDate
  const openDate = getReviewPeriod(currentYear, currentMonth).openDate
  const isOpen = now >= openDate && now <= closeDate
  const isBefore = now < openDate
  const isAfter = now > closeDate

  const [form, setForm] = useState({
    self_score: '' as Score | '',
    good_points: '',
    challenges: '',
    next_goals: '',
    app_good: '',
    app_requests: '',
  })

  // Admin: all submissions
  const [allReviews, setAllReviews] = useState<any[]>([])
  const [notSubmitted, setNotSubmitted] = useState<any[]>([])
  const [allLoading, setAllLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [adminYear, setAdminYear] = useState(target.year)
  const [adminMonth, setAdminMonth] = useState(target.month)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setMyRole(d.role ?? '')).catch(() => {})
    setLoading(true)
    Promise.all([
      fetch(`/api/review?year=${target.year}&month=${target.month}`).then(r => r.json()),
      fetch(`/api/review/deadlines?year=${currentYear}&month=${currentMonth}`).then(r => r.json()),
    ]).then(([reviewData, dlData]) => {
      if (reviewData) {
        setExisting(reviewData)
        setSubmitted(true)
        setForm({
          self_score: reviewData.self_score ?? '',
          good_points: reviewData.good_points ?? '',
          challenges: reviewData.challenges ?? '',
          next_goals: reviewData.next_goals ?? '',
          app_good: reviewData.app_good ?? '',
          app_requests: reviewData.app_requests ?? '',
        })
      }
      if (dlData?.deadlineAt) {
        setDeadlineAt(dlData.deadlineAt)
        setDeadlineInput(dlData.deadlineAt.slice(0, 16))
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (myRole !== 'admin') return
    setAllLoading(true)
    fetch(`/api/review/all?year=${adminYear}&month=${adminMonth}`)
      .then(r => r.json())
      .then(d => {
        setAllReviews(Array.isArray(d.submitted) ? d.submitted : [])
        setNotSubmitted(Array.isArray(d.notSubmitted) ? d.notSubmitted : [])
        setAllLoading(false)
      })
      .catch(() => setAllLoading(false))
  }, [myRole, adminYear, adminMonth])

  const set = (key: keyof typeof form, val: string) => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit() {
    if (!form.self_score) return
    setSaving(true)
    await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: target.year, month: target.month, ...form }),
    })
    setSaving(false)
    setSaved(true)
    setSubmitted(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleSaveDeadline() {
    if (!deadlineInput) return
    const iso = new Date(deadlineInput).toISOString()
    await fetch('/api/review/deadlines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: currentYear, month: currentMonth, deadlineAt: iso }),
    })
    setDeadlineAt(iso)
    setDeadlineSaved(true)
    setTimeout(() => setDeadlineSaved(false), 2000)
  }

  async function handleDeleteDeadline() {
    await fetch('/api/review/deadlines', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: currentYear, month: currentMonth }),
    })
    setDeadlineAt(null)
    setDeadlineInput('')
  }

  const canEdit = isOpen || myRole === 'admin'
  const showForm = !submitted || editing

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-teal-600 to-cyan-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-200 mb-1">Review</p>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList size={22} />月次振り返り</h1>
        <p className="text-sm text-teal-100 mt-0.5">{fmt(target.year, target.month)}の振り返り</p>
      </div>

      {/* 受付期間バナー */}
      <div className={`mb-3 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2
        ${isOpen ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
        <span>{isOpen ? '✅' : isBefore ? '🕐' : '🔒'}</span>
        <span>
          {currentMonth}月の受付期間：{currentMonth}月1日〜
          {deadlineAt
            ? new Date(deadlineAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : `${currentMonth}月${firstFriday}日（第一金曜）20:00`}
          {isBefore && '（まだ受付前です）'}
          {isAfter && '（受付終了）'}
          {isOpen && '（受付中）'}
        </span>
      </div>

      {/* 管理者向け期限設定 */}
      {myRole === 'admin' && (
        <div className="mb-5 bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Settings size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500">{currentMonth}月の受付締切設定</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <button
              onClick={handleSaveDeadline}
              disabled={!deadlineInput}
              className="px-3 py-1.5 bg-teal-500 text-white text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-teal-600 transition"
            >
              {deadlineSaved ? '✓ 保存' : '設定'}
            </button>
            {deadlineAt && (
              <button onClick={handleDeleteDeadline} className="p-1.5 text-gray-400 hover:text-rose-500 transition">
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">未設定の場合は第一金曜20:00がデフォルト</p>
        </div>
      )}

      {/* 提出済みバナー */}
      {submitted && !editing && (
        <div className="mb-5 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 size={20} />
              <span className="font-semibold text-sm">提出済み</span>
              {existing?.submitted_at && (
                <span className="text-xs text-gray-400 ml-1">{existing.submitted_at.slice(0, 10)}</span>
              )}
            </div>
            {canEdit && (
              <button onClick={() => setEditing(true)}
                className="text-xs text-indigo-600 hover:underline font-medium">修正する</button>
            )}
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">自己評価</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                form.self_score === '達成' ? 'bg-green-100 text-green-700' :
                form.self_score === 'ほぼ達成' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'}`}>{form.self_score}</span>
            </div>
            {[
              { key: 'good_points', label: '良かったこと' },
              { key: 'challenges', label: '課題・反省点' },
              { key: 'next_goals', label: '来月の目標' },
              { key: 'app_good', label: 'アプリの良かった点' },
              { key: 'app_requests', label: '改善・機能要望' },
            ].filter(f => form[f.key as keyof typeof form]).map(f => (
              <div key={f.key}>
                <p className="text-xs text-gray-400">{f.label}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{form[f.key as keyof typeof form]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* フォーム */}
      {showForm && (isOpen || myRole === 'admin') && !loading && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-2">📊 業務振り返り</h2>

          {/* 自己評価 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">今月の結果 自己評価 <span className="text-red-400">*</span></label>
            <div className="flex gap-2">
              {SCORE_OPTIONS.map(s => (
                <button key={s} onClick={() => set('self_score', s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${form.self_score === s ? SCORE_COLOR[s] : SCORE_IDLE}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">良かったこと・うまくいったこと</label>
            <textarea value={form.good_points} onChange={e => set('good_points', e.target.value)}
              rows={3} placeholder="今月うまくいったこと、成果など"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">課題・反省点</label>
            <textarea value={form.challenges} onChange={e => set('challenges', e.target.value)}
              rows={3} placeholder="うまくいかなかったこと、改善すべき点など"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">来月の目標</label>
            <textarea value={form.next_goals} onChange={e => set('next_goals', e.target.value)}
              rows={3} placeholder="来月意識したいこと、行動目標など"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>

          <h2 className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-2 pt-1">📱 アプリフィードバック（任意）</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">アプリの良かった点</label>
            <textarea value={form.app_good} onChange={e => set('app_good', e.target.value)}
              rows={2} placeholder="使いやすかった機能、便利だった点など"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">改善・機能追加の要望</label>
            <textarea value={form.app_requests} onChange={e => set('app_requests', e.target.value)}
              rows={2} placeholder="あったらいい機能、使いにくかった点など"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>

          <div className="flex gap-2 pt-1">
            {editing && (
              <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                キャンセル
              </button>
            )}
            <button onClick={handleSubmit} disabled={!form.self_score || saving}
              className="flex-1 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
              {saving ? <><Loader2 size={14} className="animate-spin" />送信中...</> : saved ? <><CheckCircle2 size={14} />提出しました！</> : '提出する'}
            </button>
          </div>
        </div>
      )}

      {!isOpen && !loading && !submitted && myRole !== 'admin' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400 shadow-sm">
          <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{isBefore ? `受付開始は${currentMonth}月1日からです` : '今月の受付は終了しました'}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" />読み込み中...
        </div>
      )}

      {/* 管理者：全員の提出一覧 */}
      {myRole === 'admin' && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-700">📋 提出状況（管理者）</h2>
            <div className="flex items-center gap-1">
              <select value={adminYear} onChange={e => setAdminYear(Number(e.target.value))}
                className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
                {[adminYear - 1, adminYear, adminYear + 1].map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
              <select value={adminMonth} onChange={e => setAdminMonth(Number(e.target.value))}
                className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
              </select>
            </div>
          </div>

          {allLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400"><Loader2 size={18} className="animate-spin mr-2" />読み込み中...</div>
          ) : (
            <>
            {notSubmitted.length > 0 && (
              <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-xs font-bold text-red-600 mb-1.5">⚠️ 未提出（{notSubmitted.length}名）</p>
                <div className="flex flex-wrap gap-1.5">
                  {notSubmitted.map((u: any) => (
                    <span key={u.id} className="text-xs bg-white border border-red-200 text-red-700 px-2 py-0.5 rounded-full">{u.name}</span>
                  ))}
                </div>
              </div>
            )}
            {allReviews.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">提出なし</div>
            ) : (
            <div className="space-y-2">
              {allReviews.map(r => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{r.user_name?.charAt(0)}</div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-900">{r.user_name}</p>
                        <p className="text-xs text-gray-400">{r.submitted_at?.slice(0, 10)} 提出</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-1 ${
                        r.self_score === '達成' ? 'bg-green-100 text-green-700' :
                        r.self_score === 'ほぼ達成' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'}`}>{r.self_score}</span>
                    </div>
                    {expandedId === r.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>
                  {expandedId === r.id && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                      {[
                        { label: '良かったこと', val: r.good_points },
                        { label: '課題・反省点', val: r.challenges },
                        { label: '来月の目標', val: r.next_goals },
                        { label: 'アプリの良かった点', val: r.app_good },
                        { label: '改善・機能要望', val: r.app_requests },
                      ].filter(f => f.val).map(f => (
                        <div key={f.label}>
                          <p className="text-xs font-semibold text-gray-400 mb-0.5">{f.label}</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{f.val}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
