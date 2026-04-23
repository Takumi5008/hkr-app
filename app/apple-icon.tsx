import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: 'linear-gradient(135deg, #4338ca, #2563eb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
        }}
      >
        <span style={{ color: 'white', fontSize: 70, fontWeight: 900, letterSpacing: '-2px' }}>IP</span>
      </div>
    ),
    { ...size }
  )
}
