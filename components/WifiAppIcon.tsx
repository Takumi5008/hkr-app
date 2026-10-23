import { signalAppIconSvg } from '@/lib/brandIcon'

const SRC = `data:image/svg+xml,${encodeURIComponent(signalAppIconSvg())}`

// アプリアイコン（ブランドアイコン「シグナル」）
export default function WifiAppIcon({ size = 64 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={SRC} width={size} height={size} alt="" aria-hidden style={{ display: 'block' }} />
}
