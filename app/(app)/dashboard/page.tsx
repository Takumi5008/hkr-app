import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'
import { calcHKR, formatMonth, getTwoMonthsAgo, isMonthlyCheckPeriod } from '@/lib/hkr'
import HKRCard from '@/components/HKRCard'
import { Bell, AlertCircle, PenLine } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session.userId) redirect('/login')

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const twoAgo = getTwoMonthsAgo()
  const showBanner = isMonthlyCheckPeriod()

  const productRows = await dbQuery('SELECT name FROM products ORDER BY sort_order, id')
  const products = productRows.map((p: any) => p.name)
  const records = await dbQuery(
    `SELECT * FROM records WHERE user_id = $1 AND ((year = $2 AND month = $3) OR (year = $4 AND month = $5))`,
    [session.userId, currentYear, currentMonth, twoAgo.year, twoAgo.month]
  )

  function getSummaries(year: number, month: number) {
    return products.map((product: string) => {
      const r = records.find((r) => r.year === year && r.month === month && r.product === product)
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
