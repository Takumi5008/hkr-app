const BADGES = [
  { min: 20, emoji: '🏆', label: '開通レジェンド', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { min: 15, emoji: '👑', label: '開通マスター',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { min: 10, emoji: '💎', label: '開通職人',       color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { min: 7,  emoji: '🔥', label: '開通師',         color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { min: 4,  emoji: '⚡', label: '開通士',         color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { min: 1,  emoji: '🌱', label: '見習い',         color: 'bg-green-100 text-green-700 border-green-200' },
]

export function getBadge(cumulative: number) {
  return BADGES.find((b) => cumulative >= b.min) ?? null
}

export default function ActivationBadge({ cumulative, size = 'sm' }: { cumulative: number; size?: 'sm' | 'xs' }) {
  const badge = getBadge(cumulative)
  if (!badge) return null
  return (
    <span className={`inline-flex items-center gap-0.5 font-bold rounded-full border shrink-0 ${
      size === 'xs' ? 'text-[10px] px-1.5 py-0 leading-5' : 'text-xs px-2 py-0.5'
    } ${badge.color}`}>
      {badge.emoji} {badge.label}
    </span>
  )
}
