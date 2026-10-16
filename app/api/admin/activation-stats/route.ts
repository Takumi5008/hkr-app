import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

// 回線（開通表のタブと同じ7区分）
const LINE_GROUPS = [
  { key: 'sonet',        label: 'So-net',      types: ['sonet'] },
  { key: 'wimax_post',   label: 'WiMAX後送り', types: ['wimax_post'] },
  { key: 'wimax_direct', label: 'WiMAX直せち', types: ['wimax_direct'] },
  { key: 'nifty',        label: '@nifty光',    types: ['nifty'] },
  { key: 'sbhikari',     label: 'SB光',        types: ['sbhikari'] },
  { key: 'sbair_direct', label: 'SBAir直せち', types: ['sbair_direct'] },
  { key: 'sbair_post',   label: 'SBAir後送り', types: ['sbair_post'] },
] as const

export interface LineStat {
  acquired: number   // 開通表の件数（獲得数）
  cancel: number     // 解除⭕
  activation: number // 開通⭕
}

export interface MonthStats {
  month: number
  lines: Record<string, LineStat>
  total: LineStat
}

// 開通表（全メンバー）から、指定年の各月・回線ごとの獲得数／解除数／開通数を集計する。
// 解除率 = 解除数 ÷ 獲得数、HKR = 開通数 ÷ 解除数（率の計算はクライアント側）。
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const isManager = session.role === 'manager' || session.role === 'admin' || session.role === 'viewer'
  if (!isManager) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const year = Number(new URL(req.url).searchParams.get('year'))
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'year が不正です' }, { status: 400 })
  }

  const rows = await dbQuery<{ month: number; type: string; acquired: number; cancel: number; activation: number }>(
    `SELECT month, type,
       COUNT(*)::int AS acquired,
       COUNT(CASE WHEN cancel = '○' THEN 1 END)::int AS cancel,
       COUNT(CASE WHEN activation = '○' THEN 1 END)::int AS activation
     FROM activation_records
     WHERE year = $1
     GROUP BY month, type`,
    [year]
  )

  const empty = (): LineStat => ({ acquired: 0, cancel: 0, activation: 0 })
  const months: MonthStats[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    lines: Object.fromEntries(LINE_GROUPS.map((g) => [g.key, empty()])),
    total: empty(),
  }))

  for (const r of rows) {
    const m = months[r.month - 1]
    const group = LINE_GROUPS.find((g) => (g.types as readonly string[]).includes(r.type))
    if (!m || !group) continue
    for (const target of [m.lines[group.key], m.total]) {
      target.acquired += r.acquired
      target.cancel += r.cancel
      target.activation += r.activation
    }
  }

  return NextResponse.json({
    year,
    lines: LINE_GROUPS.map(({ key, label }) => ({ key, label })),
    months,
  })
}
