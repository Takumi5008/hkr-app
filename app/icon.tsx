import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  const svg = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#06b6d4"/>
        <stop offset="50%" stop-color="#3b82f6"/>
        <stop offset="100%" stop-color="#7c3aed"/>
      </linearGradient>
      <linearGradient id="ln" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#a5f3fc"/>
        <stop offset="100%" stop-color="#ddd6fe"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" rx="175" fill="url(#bg)"/>
    <path d="M 150 164 A 150 150 0 0 1 362 164" stroke="white" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="M 189 203 A 95 95 0 0 1 323 203" stroke="white" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="M 224 238 A 45 45 0 0 1 288 238" stroke="white" stroke-width="20" fill="none" stroke-linecap="round"/>
    <circle cx="256" cy="270" r="14" fill="white"/>
    <line x1="56" y1="308" x2="456" y2="308" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
    <polyline points="56,416 118,390 178,408 248,366 308,382 368,348 456,316" stroke="url(#ln)" stroke-width="17" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="456" cy="316" r="12" fill="white"/>
  </svg>`

  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
        width={32}
        height={32}
        alt="icon"
      />
    ),
    { ...size }
  )
}
