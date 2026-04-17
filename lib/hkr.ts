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

export function isMonthlyCheckPeriod(): boolean {
  return new Date().getDate() <= 7
}

export function getTwoMonthsAgo(): { year: number; month: number } {
  const d = new Date()
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
