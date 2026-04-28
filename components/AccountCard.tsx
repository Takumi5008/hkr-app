'use client'

import UserAvatar from './UserAvatar'
import { HKR_TARGET } from '@/lib/hkr'

interface AccountCardProps {
  user: { id: number; name: string; avatar: string | null }
  hkr: number | null
  totalActivation: number
  totalCancel: number
  strengths: string[]
  improvements: string[]
}

export default function AccountCard({ user, hkr, strengths, improvements }: AccountCardProps) {
  const hkrColor = hkr == null ? 'text-teal-200' : hkr >= HKR_TARGET ? 'text-emerald-200' : 'text-rose-200'

  return (
    <div className="flex-shrink-0 w-64 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-3 flex items-center gap-3">
        <UserAvatar name={user.name} avatar={user.avatar} size="md" />
        <div className="min-w-0">
          <p className="font-bold text-white text-sm truncate">{user.name}</p>
          <p className={`text-xs font-semibold ${hkrColor}`}>
            HKR {hkr != null ? `${hkr}%` : '未入力'}
          </p>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100 flex-1">
        <p className="text-xs font-semibold text-gray-500 mb-2">✨ 特徴</p>
        {strengths.length > 0 ? (
          <ul className="space-y-1.5">
            {strengths.map((s, i) => (
              <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                <span className="text-emerald-400 shrink-0 mt-0.5">●</span>{s}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-300">データなし</p>
        )}
      </div>

      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">⚡ 改善すべき点</p>
        {improvements.length > 0 ? (
          <ul className="space-y-1.5">
            {improvements.map((s, i) => (
              <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                <span className="text-amber-400 shrink-0 mt-0.5">●</span>{s}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-emerald-600 font-medium">改善点なし 🎉</p>
        )}
      </div>
    </div>
  )
}
