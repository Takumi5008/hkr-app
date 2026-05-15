'use client'
import { useId } from 'react'

export default function WifiAppIcon({ size = 64 }: { size?: number }) {
  const uid = useId().replace(/:/g, '')
  const bgId   = `bg${uid}`
  const lineId = `line${uid}`
  const clipId = `clip${uid}`

  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        {/* Background: cyan → blue → violet (diagonal) */}
        <linearGradient id={bgId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="512" y2="512">
          <stop offset="0%"   stopColor="#06b6d4" />
          <stop offset="50%"  stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>

        {/* Sparkline gradient */}
        <linearGradient id={lineId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="512" y2="0">
          <stop offset="0%"   stopColor="#a5f3fc" />
          <stop offset="100%" stopColor="#ddd6fe" />
        </linearGradient>

        {/* Clip to rounded-rect shape */}
        <clipPath id={clipId}>
          <rect width="512" height="512" rx="175" />
        </clipPath>
      </defs>

      {/* Background (solid fallback first, then gradient overlay) */}
      <rect width="512" height="512" rx="175" fill="#3b82f6" />
      <rect width="512" height="512" rx="175" fill={`url(#${bgId})`} />
      {/* Soft edge border */}
      <rect width="512" height="512" rx="175" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="6" />

      <g clipPath={`url(#${clipId})`}>
        {/* Top-left shimmer */}
        <ellipse cx="140" cy="110" rx="200" ry="130" fill="rgba(255,255,255,0.10)" />

        {/* ── Wi-Fi arcs (center: 256, 270) ── */}
        <path d="M 150 164 A 150 150 0 0 1 362 164"
          stroke="white" strokeWidth="20" fill="none" strokeLinecap="round" opacity="0.95" />
        <path d="M 189 203 A 95 95 0 0 1 323 203"
          stroke="white" strokeWidth="20" fill="none" strokeLinecap="round" opacity="0.95" />
        <path d="M 224 238 A 45 45 0 0 1 288 238"
          stroke="white" strokeWidth="20" fill="none" strokeLinecap="round" opacity="0.95" />
        {/* Dot */}
        <circle cx="256" cy="270" r="14" fill="white" />

        {/* Divider */}
        <line x1="56" y1="308" x2="456" y2="308"
          stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />

        {/* ── Sparkline (upper-right trend) ── */}
        <path
          d="M 56 456 L 56 416 L 118 390 L 178 408 L 248 366 L 308 382 L 368 348 L 440 316 L 456 316 L 456 456 Z"
          fill={`url(#${lineId})`}
          opacity="0.14"
        />
        <polyline
          points="56,416 118,390 178,408 248,366 308,382 368,348 456,316"
          stroke={`url(#${lineId})`}
          strokeWidth="17"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 8px rgba(165,243,252,0.85))' }}
        />
        {/* End dot */}
        <circle cx="456" cy="316" r="12" fill="white" opacity="0.95"
          style={{ filter: 'drop-shadow(0 0 7px rgba(221,214,254,1))' }} />
      </g>
    </svg>
  )
}
