import { HKR_TARGET } from '@/lib/hkr'

interface HKRCardProps {
  product: string
  cancel_count: number
  activation_count: number
  hkr: number | null
  highlight?: boolean
}

export default function HKRCard({ product, cancel_count, activation_count, hkr, highlight }: HKRCardProps) {
  const noData = cancel_count === 0
  const above = hkr === null || hkr >= HKR_TARGET

  return (
    <div className={`rounded-2xl p-5 shadow-sm border ${
      noData
        ? 'bg-white border-gray-200'
        : above
          ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
          : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
    } ${highlight ? 'ring-2 ring-amber-300' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-semibold ${noData ? 'text-gray-500' : above ? 'text-emerald-700' : 'text-red-700'}`}>
          {product}
        </span>
        {!noData && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            above
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {above ? '✓ 目標達成' : '✗ 目標未達'}
          </span>
        )}
      </div>

      <p className={`text-4xl font-black tracking-tight ${
        noData ? 'text-gray-300' : above ? 'text-emerald-600' : 'text-red-600'
      }`}>
        {noData ? '未入力' : hkr !== null ? `${hkr}%` : '-'}
      </p>

      {!noData && hkr !== null && (
        <div className="mt-4">
          <div className="relative h-2.5 bg-white/70 rounded-full overflow-hidden shadow-inner">
            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                above ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-red-400 to-rose-500'
              }`}
              style={{ width: `${Math.min(hkr, 100)}%` }}
            />
            <div className="absolute top-0 h-full w-0.5 bg-gray-400/60" style={{ left: `${HKR_TARGET}%` }} />
          </div>
          <p className={`text-xs mt-1.5 font-medium ${above ? 'text-emerald-600' : 'text-red-500'}`}>
            目標: {HKR_TARGET}%
          </p>
        </div>
      )}

      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span>解除: <span className="font-semibold text-gray-700">{cancel_count}件</span></span>
        <span>開通: <span className="font-semibold text-gray-700">{activation_count}件</span></span>
      </div>
    </div>
  )
}
