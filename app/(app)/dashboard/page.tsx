import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'
import { calcHKR, formatMonth, getTwoMonthsAgo, isMonthlyCheckPeriod } from '@/lib/hkr'
import HKRCard from '@/components/HKRCard'
import { Bell, AlertCircle, PenLine, CheckCircle2, Circle } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session.userId) redirect('/login')

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentDay = now.getDate()
  const twoAgo = getTwoMonthsAgo()
  const showBanner = isMonthlyCheckPeriod()

  const mm = String(currentMonth).padStart(2, '0')
  const dd = String(currentDay).padStart(2, '0')
  const todayFmts = [
    `${currentYear}-${mm}-${dd}`, `${currentYear}/${mm}/${dd}`, `${currentYear}/${currentMonth}/${currentDay}`,
    `${currentMonth}/${currentDay}`, `${mm}/${dd}`, `${currentMonth}月${currentDay}日`, `${mm}月${dd}日`,
  ]
  const ph = todayFmts.map((_, i) => `$${i + 1}`).join(', ')

  const productRows = await dbQuery('SELECT name FROM products ORDER BY sort_order, id')
  const products = productRows.map((p: any) => p.name)
  const records = await dbQuery(
    `SELECT * FROM records WHERE user_id = $1 AND ((year = $2 AND month = $3) OR (year = $4 AND month = $5))`,
    [session.userId, currentYear, currentMonth, twoAgo.year, twoAgo.month]
  )

  // 今月入力済みの商材
  const inputtedProducts = new Set(
    records.filter((r: any) => r.year === currentYear && r.month === currentMonth && (r.activation_count > 0 || r.cancel_count > 0)).map((r: any) => r.product)
  )

  // 本日のフォロー対応アラート
  let followAlerts: { name: string; staffName: string; typeLabel: string; fieldLabel: string }[] = []
  try {
    const [sonetRows, directRows, postRows] = await Promise.all([
      dbQuery<{ name: string; staff_name: string }>(`SELECT ar.name, u.name AS staff_name FROM activation_records ar JOIN users u ON u.id = ar.user_id WHERE ar.type='sonet' AND ar.construction_date IN (${ph})`, todayFmts),
      dbQuery<{ name: string; staff_name: string }>(`SELECT ar.name, u.name AS staff_name FROM activation_records ar JOIN users u ON u.id = ar.user_id WHERE ar.type='wimax_direct' AND ar.week_after IN (${ph})`, todayFmts),
      dbQuery<{ name: string; staff_name: string }>(`SELECT ar.name, u.name AS staff_name FROM activation_records ar JOIN users u ON u.id = ar.user_id WHERE ar.type='wimax_post' AND ar.week_after_delivery IN (${ph})`, todayFmts),
    ])
    followAlerts = [
      ...sonetRows.map(r => ({ name: r.name, staffName: r.staff_name, typeLabel: 'So-net', fieldLabel: '工事日当日' })),
      ...directRows.map(r => ({ name: r.name, staffName: r.staff_name, typeLabel: 'WiMAX直せち', fieldLabel: '獲得後1週間後' })),
      ...postRows.map(r => ({ name: r.name, staffName: r.staff_name, typeLabel: 'WiMAX後送り', fieldLabel: '受取日1週間後' })),
    ]
  } catch {}

  function getSummaries(year: number, month: number) {
    return products.map((product: string) => {
      const r = records.find((r: any) => r.year === year && r.month === month && r.product === product)
      const cancel = r?.cancel_count ?? 0
      const activation = r?.activation_count ?? 0
      return { product, cancel_count: cancel, activation_count: activation, hkr: calcHKR(activation, cancel) }
    })
  }

  const currentSummaries = getSummaries(currentYear, currentMonth)
  const twoAgoSummaries = getSummaries(twoAgo.year, twoAgo.month)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* ページヘッダー */}
      <div className="mb-6 bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200 mb-1">Dashboard</p>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-indigo-200 mt-0.5">{formatMonth(currentYear, currentMonth)}の進捗状況</p>
      </div>

      {/* 今日やること */}
      <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          📋 今日やること
        </h2>
        <div className="space-y-2">
          {products.map((product: string) => {
            const done = inputtedProducts.has(product)
            return (
              <div key={product} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50">
                {done
                  ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  : <Circle size={16} className="text-gray-300 shrink-0" />}
                <span className={`text-sm flex-1 ${done ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>
                  {product} HKR入力
                </span>
                {!done && (
                  <Link href="/input" className="text-xs text-indigo-600 font-medium hover:underline shrink-0">入力する →</Link>
                )}
              </div>
            )
          })}
          {followAlerts.length > 0 && (
            <div className="flex items-start gap-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-base shrink-0 mt-0.5">🔔</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-700">本日のフォロー対応 {followAlerts.length}件</p>
                <div className="mt-1 space-y-0.5">
                  {followAlerts.map((item, i) => (
                    <p key={i} className="text-xs text-amber-600">
                      {item.staffName}さん：{item.typeLabel} — {item.name}さん（{item.fieldLabel}）
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showBanner && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 shadow-sm">
          <Bell size={20} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {formatMonth(twoAgo.year, twoAgo.month)}のHKR確認期間です
            </p>
            <p className="text-xs text-amber-600 mt-0.5">2ヶ月前の開通結果が確定しました。</p>
          </div>
        </div>
      )}

      {showBanner && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" />
            {formatMonth(twoAgo.year, twoAgo.month)}の結果
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {twoAgoSummaries.map((s) => (
              <HKRCard key={s.product} {...s} highlight />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">
            {formatMonth(currentYear, currentMonth)}のHKR
          </h2>
          <Link href="/input" className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
            <PenLine size={14} />データ入力
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentSummaries.map((s) => (
            <HKRCard key={s.product} {...s} />
          ))}
        </div>
      </section>
    </div>
  )
}
