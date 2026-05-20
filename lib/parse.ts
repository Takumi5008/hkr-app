// 全角数字・小数点を半角に変換してから数値パース
function toHalf(v: unknown): string {
  return String(v ?? '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/。/g, '.')
}

export function toInt(v: unknown, fallback = 0): number {
  const n = parseInt(toHalf(v), 10)
  return isNaN(n) ? fallback : n
}

export function toFloat(v: unknown, fallback = 0): number {
  const n = parseFloat(toHalf(v))
  return isNaN(n) ? fallback : n
}
