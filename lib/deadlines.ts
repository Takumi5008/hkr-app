import { dbQueryOne, dbRun } from '@/lib/db'

// シフト・MTG出欠の提出締切
// 既定：対象月の前月20日 23:59（JST）。管理画面で月ごとに上書きした値があればそちらを使う。
// deadline_at は 'YYYY-MM-DDTHH:mm'（JST・タイムゾーン表記なし）で保存する。

export type DeadlineKind = 'shift' | 'mtg'

const TABLE: Record<DeadlineKind, string> = {
  shift: 'shift_deadlines',
  mtg: 'mtg_month_deadlines',
}

export const DEFAULT_DEADLINE_DAY = 20

export function defaultDeadlineAt(year: number, month: number): string {
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}-${DEFAULT_DEADLINE_DAY}T23:59`
}

// 'YYYY-MM-DDTHH:mm'（JST）→ Date。サーバー（UTC）でも JST として解釈する
export function deadlineToDate(deadlineAt: string): Date {
  return new Date(deadlineAt.slice(0, 16) + ':00+09:00')
}

export function isPast(deadlineAt: string, now: Date = new Date()): boolean {
  return deadlineToDate(deadlineAt) < now
}

// 締切を取得。未設定の月は既定値で登録してから返す（リマインダー cron が行を参照するため）
export async function getDeadlineAt(kind: DeadlineKind, year: number, month: number): Promise<string> {
  const table = TABLE[kind]
  await dbRun(
    `INSERT INTO ${table} (year, month, deadline_at) VALUES ($1, $2, $3) ON CONFLICT (year, month) DO NOTHING`,
    [year, month, defaultDeadlineAt(year, month)]
  )
  const row = await dbQueryOne<{ deadline_at: string }>(
    `SELECT deadline_at FROM ${table} WHERE year = $1 AND month = $2`,
    [year, month]
  )
  return row?.deadline_at ?? defaultDeadlineAt(year, month)
}

export async function isDeadlinePassed(kind: DeadlineKind, year: number, month: number): Promise<boolean> {
  return isPast(await getDeadlineAt(kind, year, month))
}

// 今（JST）の翌月。今月中に締切を迎えるのはこの月の提出
export function nextMonthJst(now: Date = new Date()): { year: number; month: number } {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const y = jst.getUTCFullYear()
  const m = jst.getUTCMonth() + 1
  return m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 }
}
