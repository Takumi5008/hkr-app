'use client'

import PlayerCard, { type PlayerCardData } from './PlayerCard'

export default function PlayerCardsSection({ cards }: { cards: PlayerCardData[] }) {
  if (cards.length === 0) return null
  return (
    <div className="mt-6">
      <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        🃏 チームカード
        <span className="text-xs font-normal text-gray-400">今月の成績で自動更新</span>
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1" style={{ scrollSnapType: 'x mandatory' }}>
        {cards.map((card) => (
          <div key={card.userId} style={{ scrollSnapAlign: 'start', flexShrink: 0 }}>
            <PlayerCard card={card} />
          </div>
        ))}
      </div>
    </div>
  )
}
