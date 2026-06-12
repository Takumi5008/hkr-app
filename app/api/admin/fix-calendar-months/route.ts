import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

// activation_date の各形式をパース（年不明な場合は2026を使用）
function parseDate(s: string): { year: number; month: number; day: number } | null {
  if (!s) return null

  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return { year: parseInt(iso[1]), month: parseInt(iso[2]), day: parseInt(iso[3]) }

  // YYYY/M/D
  const ymd = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/)
  if (ymd) return { year: parseInt(ymd[1]), month: parseInt(ymd[2]), day: parseInt(ymd[3]) }

  // M/D または M月D日
  const md = s.match(/^(\d{1,2})[\/月](\d{1,2})/)
  if (md) return { year: 2026, month: parseInt(md[1]), day: parseInt(md[2]) }

  return null
}

// 業務月：日が25以上→当月、24以下→前月
function businessMonth(year: number, month: number, day: number) {
  if (day >= 25) return { year, month }
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'admin' && session.role !== 'manager') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const entries = await dbQuery<{ id: number; activation_date: string; year: number; month: number }>(
    'SELECT id, activation_date, year, month FROM opening_calendar',
    []
  )

  let updated = 0
  const skipped: string[] = []

  for (const entry of entries) {
    const parsed = parseDate(entry.activation_date)
    if (!parsed) {
      skipped.push(`id=${entry.id} date="${entry.activation_date}"`)
      continue
    }
    const bm = businessMonth(parsed.year, parsed.month, parsed.day)
    if (bm.year !== entry.year || bm.month !== entry.month) {
      await dbRun(
        'UPDATE opening_calendar SET year = $1, month = $2 WHERE id = $3',
        [bm.year, bm.month, entry.id]
      )
      updated++
    }
  }

  return NextResponse.json({ ok: true, total: entries.length, updated, skipped })
}
