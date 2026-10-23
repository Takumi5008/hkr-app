import { ImageResponse } from 'next/og'
import { signalAppIconSvg } from '@/lib/brandIcon'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`data:image/svg+xml,${encodeURIComponent(signalAppIconSvg())}`}
        width={32}
        height={32}
        alt="icon"
      />
    ),
    { ...size }
  )
}
