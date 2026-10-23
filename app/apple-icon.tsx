import { ImageResponse } from 'next/og'
import { signalAppIconSvg } from '@/lib/brandIcon'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// iOS は自動で角丸にするため、角丸なし（full-bleed）で出力する
export default function AppleIcon() {
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`data:image/svg+xml,${encodeURIComponent(signalAppIconSvg({ rounded: false }))}`}
        width={180}
        height={180}
        alt="icon"
      />
    ),
    { ...size }
  )
}
