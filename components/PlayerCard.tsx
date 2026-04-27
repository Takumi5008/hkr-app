'use client'

export type CardTier = 'bronze' | 'silver' | 'gold' | 'elite' | 'totw'
export type FormResult = 'W' | 'D' | 'L'

export interface PlayerCardData {
  userId: number
  name: string
  rank: number
  ovr: number
  tier: CardTier
  isTotw: boolean
  stats: { label: string; value: number }[]
  form: FormResult[]
}

const TIER = {
  totw: {
    card: 'from-emerald-800 via-teal-600 to-emerald-900',
    shine: 'from-teal-300/40 via-transparent to-transparent',
    ovr: 'text-white',
    name: 'text-white',
    sub: 'text-teal-200',
    bar: 'bg-teal-300',
    border: 'border-teal-400/60',
    label: 'TOTW ⭐',
    labelBg: 'bg-teal-400/30 text-teal-100',
  },
  elite: {
    card: 'from-violet-950 via-purple-800 to-indigo-950',
    shine: 'from-violet-400/30 via-transparent to-transparent',
    ovr: 'text-white',
    name: 'text-white',
    sub: 'text-violet-300',
    bar: 'bg-violet-300',
    border: 'border-violet-500/60',
    label: 'ELITE',
    labelBg: 'bg-violet-500/30 text-violet-200',
  },
  gold: {
    card: 'from-yellow-500 via-amber-400 to-yellow-600',
    shine: 'from-white/50 via-transparent to-transparent',
    ovr: 'text-yellow-950',
    name: 'text-yellow-950',
    sub: 'text-yellow-800',
    bar: 'bg-yellow-800',
    border: 'border-yellow-300/80',
    label: 'GOLD',
    labelBg: 'bg-yellow-300/50 text-yellow-900',
  },
  silver: {
    card: 'from-slate-500 via-gray-400 to-slate-600',
    shine: 'from-white/40 via-transparent to-transparent',
    ovr: 'text-white',
    name: 'text-white',
    sub: 'text-slate-200',
    bar: 'bg-slate-200',
    border: 'border-slate-300/60',
    label: 'SILVER',
    labelBg: 'bg-slate-300/30 text-slate-100',
  },
  bronze: {
    card: 'from-amber-800 via-amber-700 to-stone-800',
    shine: 'from-white/20 via-transparent to-transparent',
    ovr: 'text-amber-100',
    name: 'text-amber-100',
    sub: 'text-amber-300',
    bar: 'bg-amber-400',
    border: 'border-amber-600/60',
    label: 'BRONZE',
    labelBg: 'bg-amber-400/20 text-amber-200',
  },
}

const FORM_COLOR = { W: 'bg-emerald-400', D: 'bg-yellow-400', L: 'bg-red-500' }
const FORM_LABEL = { W: 'W', D: 'D', L: 'L' }

export default function PlayerCard({ card }: { card: PlayerCardData }) {
  const t = TIER[card.tier]
  return (
    <div className={`relative rounded-2xl bg-gradient-to-br ${t.card} border ${t.border} shadow-xl overflow-hidden select-none`}
         style={{ width: 140, minHeight: 210 }}>
      {/* Shine overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${t.shine} pointer-events-none`} />

      {/* Top row */}
      <div className="relative px-3 pt-3 flex items-start justify-between">
        <div>
          <p className={`text-3xl font-black leading-none ${t.ovr}`}>{card.ovr}</p>
          <p className={`text-[11px] font-bold mt-0.5 ${t.sub}`}>#{card.rank}</p>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${t.labelBg}`}>
          {t.label}
        </span>
      </div>

      {/* Avatar */}
      <div className="relative flex justify-center my-2">
        <div className={`w-14 h-14 rounded-full border-2 ${t.border} flex items-center justify-center shadow-inner`}
             style={{ background: 'rgba(255,255,255,0.15)' }}>
          <span className={`text-2xl font-black ${t.name}`}>{card.name.charAt(0)}</span>
        </div>
      </div>

      {/* Name */}
      <p className={`text-center text-[13px] font-extrabold px-2 leading-tight ${t.name}`}>
        {card.name}
      </p>

      {/* Divider */}
      <div className={`mx-3 my-2 border-t ${t.border}`} />

      {/* Stats */}
      <div className="px-3 space-y-1 pb-2">
        {card.stats.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold w-7 shrink-0 ${t.sub}`}>{s.label}</span>
            <div className="flex-1 h-1 bg-black/20 rounded-full overflow-hidden">
              <div className={`h-full ${t.bar} rounded-full`} style={{ width: `${s.value}%` }} />
            </div>
            <span className={`text-[10px] font-bold w-4 text-right shrink-0 ${t.ovr}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="flex items-center justify-center gap-1 pb-3">
        {card.form.map((f, i) => (
          <div key={i} className={`w-4 h-4 rounded-full ${FORM_COLOR[f]} flex items-center justify-center`}>
            <span className="text-[8px] font-black text-white">{FORM_LABEL[f]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
