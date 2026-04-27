'use client'

import { useEffect, useMemo } from 'react'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export default function CelebrationOverlay({ count, onDone }: { count: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])

  const particles = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: `${5 + (i * 3.3) % 90}%`,
      top: `${(i * 7 + 10) % 80}%`,
      color: COLORS[i % COLORS.length],
      delay: `${(i * 0.07).toFixed(2)}s`,
      dur: `${0.6 + (i % 4) * 0.15}s`,
      rotate: `${i * 47}deg`,
    })), [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-30px) rotate(0deg) scale(0); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translateY(120px) rotate(360deg) scale(1); opacity: 0; }
        }
        @keyframes pop-in {
          0%   { transform: scale(0.4); opacity: 0; }
          70%  { transform: scale(1.12); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes fade-out {
          0%   { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
        .celebration-card { animation: pop-in 0.4s ease-out, fade-out 3.5s ease-in-out forwards; }
        .confetti-piece   { animation: confetti-fall var(--dur) var(--delay) ease-out forwards; }
      `}</style>

      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-piece absolute w-2.5 h-2.5 rounded-sm"
          style={{
            left: p.left, top: p.top,
            background: p.color,
            '--delay': p.delay,
            '--dur': p.dur,
            transform: `rotate(${p.rotate})`,
          } as React.CSSProperties}
        />
      ))}

      <div className="celebration-card bg-white rounded-3xl shadow-2xl px-8 py-7 text-center border-2 border-indigo-200">
        <div className="text-5xl mb-2">🎉</div>
        <div className="text-4xl font-black text-indigo-700">{count}件 開通！</div>
        <div className="text-sm text-gray-500 mt-2 font-medium">チームに貢献しました！</div>
      </div>
    </div>
  )
}
