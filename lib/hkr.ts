export const PRODUCTS = ['So-net光', 'WiMAX'] as const
export type Product = typeof PRODUCTS[number]
export const HKR_TARGET = 80

export function calcHKR(activation: number, cancel: number): number | null {
  if (cancel === 0) return null
  return Math.round((activation / cancel) * 1000) / 10
}

export function isAboveTarget(hkr: number | null): boolean {
  if (hkr === null) return true
  return hkr >= HKR_TARGET
}

// サーバー(Vercel)はデフォルトでUTC実行のため、素の new Date().getDate() 等は
// JST 0:00〜8:59 の間「前日」を指してしまう。日付だけは常に Asia/Tokyo で取り出す。
export function getJSTParts(base: Date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(base)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { year: get('year'), month: get('month'), day: get('day') }
}

export function isMonthlyCheckPeriod(): boolean {
  return getJSTParts().day <= 7
}

export function getTwoMonthsAgo(): { year: number; month: number } {
  const { year, month } = getJSTParts()
  const d = new Date(year, month - 1, 1)
  d.setMonth(d.getMonth() - 2)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function formatMonth(year: number, month: number): string {
  return `${year}年${month}月`
}

export function getPastMonths(count: number): { year: number; month: number; label: string }[] {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${d.getMonth() + 1}月`,
    }
  })
}
