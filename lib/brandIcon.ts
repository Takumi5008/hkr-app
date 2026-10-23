// ブランドアイコン「シグナル」（Wi-Fiの電波をシンプルに再構成したマーク）
// アプリアイコン（favicon / apple-icon / PWA）とログイン画面ロゴの共通定義

// 電波マークの形状（viewBox 0 0 512 512 上の座標。中心 256,330）
export const SIGNAL_ARCS = {
  outer: 'M 135.8 209.8 A 170 170 0 0 1 376.2 209.8',
  inner: 'M 188.8 262.8 A 95 95 0 0 1 323.2 262.8',
  dot: { cx: 256, cy: 340, r: 34 },
  strokeWidth: 50,
}

const markSvg = (idPrefix: string) => `
  <defs>
    <linearGradient id="${idPrefix}arc" gradientUnits="userSpaceOnUse" x1="120" y1="0" x2="392" y2="0">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
    <radialGradient id="${idPrefix}dot" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0%" stop-color="#bae6fd"/>
      <stop offset="45%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </radialGradient>
  </defs>
  <path d="${SIGNAL_ARCS.outer}" stroke="url(#${idPrefix}arc)" stroke-width="${SIGNAL_ARCS.strokeWidth}" fill="none" stroke-linecap="round"/>
  <path d="${SIGNAL_ARCS.inner}" stroke="url(#${idPrefix}arc)" stroke-width="${SIGNAL_ARCS.strokeWidth}" fill="none" stroke-linecap="round"/>
  <circle cx="${SIGNAL_ARCS.dot.cx}" cy="${SIGNAL_ARCS.dot.cy}" r="${SIGNAL_ARCS.dot.r}" fill="url(#${idPrefix}dot)"/>`

// アプリアイコン（濃紺の角丸スクエア＋電波マーク）。maskable 用に full-bleed も選べる
export function signalAppIconSvg({ rounded = true }: { rounded?: boolean } = {}): string {
  const rx = rounded ? 112 : 0
  return `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#16295a"/>
      <stop offset="100%" stop-color="#050b1a"/>
    </linearGradient>
    <radialGradient id="hl" cx="0.3" cy="0.15" r="0.7">
      <stop offset="0%" stop-color="rgba(96,165,250,0.28)"/>
      <stop offset="100%" stop-color="rgba(96,165,250,0)"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>
  <rect width="512" height="512" rx="${rx}" fill="url(#hl)"/>
  ${rounded ? `<rect x="3" y="3" width="506" height="506" rx="${rx - 3}" fill="none" stroke="rgba(96,165,250,0.35)" stroke-width="6"/>` : ''}
  <g transform="translate(256 256) scale(${rounded ? 1.3 : 1.1}) translate(-256 -256)">${markSvg('m')}</g>
</svg>`
}

// 背景なしの電波マーク単体（ログイン画面ロゴ用）
export function signalMarkSvg(): string {
  return `<svg viewBox="100 128 312 252" xmlns="http://www.w3.org/2000/svg">${markSvg('s')}</svg>`
}
