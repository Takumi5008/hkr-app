'use client'

import UserAvatar from './UserAvatar'
import { getBadge } from './ActivationBadge'
import { HKR_TARGET } from '@/lib/hkr'

interface AccountCardProps {
  user: { id: number; name: string; avatar: string | null; points: number }
  hkr: number | null
  totalActivation: number
  totalCancel: number
  loginCount: number
  entryDays: number
  mtgAbsent: number
  strengths: string[]
  improvements: string[]
  compact?: boolean
}

export default function AccountCard({
  user, hkr, totalActivation, totalCancel, loginCount, entryDays, mtgAbsent, strengths, improvements, compact = false
}: AccountCardProps) {
  const hkrColor = hkr == null ? 'text-teal-200' : hkr >= HKR_TARGET ? 'text-emerald-200' : 'text-rose-200'
  const badge = getBadge(totalActivation)

  return (
    <div className="flex-shrink-0 w-64 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-3 flex items-center gap-3">
        <UserAvatar name={user.name} avatar={user.avatar} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <p className="font-bold text-white text-sm truncate">{user.name}</p>
            {(user.points ?? 0) > 0 && (
              <span className="text-[11px] font-bold text-teal-100 shrink-0">{user.points}pt</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <p className={`text-xs font-semibold ${hkrColor}`}>
              HKR {hkr != null ? `${hkr}%` : '未入力'}
            </p>
            {badge && (
              <span className="text-[10px] font-bold text-teal-100">
                {badge.emoji} {badge.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ミニ統計バー */}
      <div className="flex border-b border-gray-100 text-center">
        <div className="flex-1 py-2 border-r border-gray-100">
          <p className="text-xs font-bold text-gray-700">{totalActivation}</p>
          <p className="text-[10px] text-gray-400">開通</p>
        </div>
        <div className="flex-1 py-2 border-r border-gray-100">
          <p className={`text-xs font-bold ${mtgAbsent > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
            {mtgAbsent > 0 ? `欠${mtgAbsent}` : '皆勤'}
          </p>
          <p className="text-[10px] text-gray-400">MTG</p>
        </div>
        <div className="flex-1 py-2 border-r border-gray-100">
          <p className={`text-xs font-bold ${entryDays === 0 ? 'text-gray-300' : 'text-indigo-600'}`}>{entryDays}</p>
          <p className="text-[10px] text-gray-400">行動表</p>
        </div>
        <div className="flex-1 py-2">
          <p className={`text-xs font-bold ${loginCount === 0 ? 'text-gray-300' : 'text-violet-600'}`}>{loginCount}</p>
          <p className="text-[10px] text-gray-400">ログイン</p>
        </div>
      </div>

      {/* 特徴・改善点 */}
      {!compact && (
        <>
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
        </>
      )}
    </div>
  )
}
