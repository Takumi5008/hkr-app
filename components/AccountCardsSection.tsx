'use client'

import AccountCard from './AccountCard'
import { HKR_TARGET } from '@/lib/hkr'

interface MemberStat {
  user: { id: number; name: string; avatar: string | null }
  summaries: { product: string; cancel: number; activation: number; hkr: number | null }[]
  allHkr: number | null
  totalActivation: number
  totalCancel: number
}

interface Props {
  stats: MemberStat[]
  products: string[]
}

function buildStrengths(member: MemberStat, teamAvgActivation: number, teamAvgHkr: number | null): string[] {
  const { allHkr, totalActivation, totalCancel, summaries } = member
  const result: string[] = []

  if (allHkr != null) {
    if (allHkr >= 90) result.push(`高HKRを維持（${allHkr}%）`)
    else if (allHkr >= HKR_TARGET) result.push(`目標HKRを達成（${allHkr}%）`)

    if (teamAvgHkr != null && allHkr > teamAvgHkr) result.push(`チーム平均HKR（${teamAvgHkr}%）を上回る`)
  }

  if (totalActivation > 0 && totalActivation > teamAvgActivation)
    result.push(`開通数が平均以上（${totalActivation}件）`)

  const activeProducts = summaries.filter((s) => s.cancel > 0)
  if (activeProducts.length >= 2) result.push(`${activeProducts.length}商材で実績あり`)

  if (totalCancel === 0 && totalActivation > 0) result.push('解除ゼロを達成')

  return result.slice(0, 3)
}

function buildImprovements(member: MemberStat, teamAvgActivation: number, products: string[]): string[] {
  const { allHkr, totalActivation, totalCancel, summaries } = member
  const result: string[] = []

  if (allHkr == null) {
    result.push('データの入力が必要')
    return result
  }

  if (allHkr < HKR_TARGET) {
    result.push(`HKR改善が必要（目標${HKR_TARGET}%、現在${allHkr}%）`)
    const gap = Math.round((HKR_TARGET - allHkr) * 10) / 10
    result.push(`あと${gap}%で目標達成`)
  }

  if (totalActivation > 0 && totalActivation < Math.round(teamAvgActivation))
    result.push(`開通数を増やす（チーム平均${Math.round(teamAvgActivation)}件）`)

  const activeProducts = summaries.filter((s) => s.cancel > 0)
  if (activeProducts.length <= 1 && products.length > 1)
    result.push('他商材への展開を検討')

  if (totalActivation > 0 && totalCancel > totalActivation * 0.3)
    result.push('解除数の抑制（解除率が高め）')

  return result.slice(0, 3)
}

export default function AccountCardsSection({ stats, products }: Props) {
  if (stats.length === 0) return null

  const validHkrs = stats.filter((d) => d.allHkr != null).map((d) => d.allHkr!)
  const teamAvgHkr = validHkrs.length > 0
    ? Math.round(validHkrs.reduce((a, b) => a + b, 0) / validHkrs.length * 10) / 10
    : null
  const teamAvgActivation = stats.length > 0
    ? stats.reduce((s, d) => s + d.totalActivation, 0) / stats.length
    : 0

  return (
    <div className="mt-4">
      <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        👤 アカウントカード
        <span className="text-xs font-normal text-gray-400">各メンバーの特徴と改善点</span>
      </h2>
      <div
        className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {stats.map((member) => (
          <div key={member.user.id} style={{ scrollSnapAlign: 'start' }}>
            <AccountCard
              user={member.user}
              hkr={member.allHkr}
              totalActivation={member.totalActivation}
              totalCancel={member.totalCancel}
              strengths={buildStrengths(member, teamAvgActivation, teamAvgHkr)}
              improvements={buildImprovements(member, teamAvgActivation, products)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
