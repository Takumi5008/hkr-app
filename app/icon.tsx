import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: 'linear-gradient(135deg, #4338ca, #2563eb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
        }}
      >
        <span style={{ color: 'white', fontSize: 13, fontWeight: 900, letterSpacing: '-0.5px' }}>IP</span>
      </div>
    ),
    { ...size }
  )
}
