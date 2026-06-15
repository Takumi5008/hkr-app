import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun, dbQueryOne } from '@/lib/db'
import { awardBadges } from '@/lib/badges'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year   = parseInt(searchParams.get('year')   ?? '0')
  const month  = parseInt(searchParams.get('month')  ?? '0')
  const userId = searchParams.get('userId')

  const isManager = session.role === 'manager' || session.role === 'viewer' || session.role === 'admin'
  const targetId  = isManager && userId ? parseInt(userId) : session.userId

  const nm = month === 12 ? 1 : month + 1
  const ny = month === 12 ? year + 1 : year

  // activation_date の各形式をパースして業務期間内かを判定
  function dateInPeriod(dateStr: string): boolean {
    if (!dateStr) return false
    let dy: number | null = null, dm: number | null = null, dd: number | null = null
    const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) { dy = +iso[1]; dm = +iso[2]; dd = +iso[3] }
    else {
      const ymd = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/)
      if (ymd) { dy = +ymd[1]; dm = +ymd[2]; dd = +ymd[3] }
      else {
        const md = dateStr.match(/^(\d{1,2})[\/月](\d{1,2})/)
        if (md) { dm = +md[1]; dd = +md[2] }
      }
    }
    if (dm === null || dd === null) return false
    if (dy !== null) {
      const val = dy * 10000 + dm * 100 + dd
      const start = year * 10000 + month * 100 + 25
      const end   = ny   * 10000 + nm    * 100 + 24
      return val >= start && val <= end
    }
    // 年なしの場合: 月/日だけで判定
    if (dm === month && dd >= 25) return true
    if (dm === nm    && dd <= 24) return true
    if (month < nm && dm > month && dm < nm) return true
    if (month > nm && (dm > month || dm < nm)) return true
    return false
  }

  type CalRow = { year: number; month: number; activation_date: string; customer_name: string; id: number; activation_record_id: number | null; created_at: string; [key: string]: unknown }

  const allRows = await dbQuery(`SELECT * FROM opening_calendar WHERE user_id = $1`, [targetId]) as CalRow[]

  // 期間フィルタ → activation_record_id優先でソート
  const filtered = allRows
    .filter(r => (r.year === year && r.month === month) || dateInPeriod(r.activation_date))
    .sort((a, b) => {
      if (!!b.activation_record_id !== !!a.activation_record_id) return b.activation_record_id ? 1 : -1
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  // 重複排除: 同じ customer_name でも activation_record_id が異なる場合は別顧客として両方残す
  // 同一 activation_record_id (または両方null) で名前が同じ場合のみ先を優先して除外
  const seenRecordIds = new Set<number>()
  const seenManualNames = new Set<string>()
  const distinct = filtered.filter(r => {
    if (r.activation_record_id !== null) {
      if (seenRecordIds.has(r.activation_record_id)) return false
      seenRecordIds.add(r.activation_record_id)
      return true
    } else {
      // 手動入力: 同名エントリが既にある場合は除外
      if (seenManualNames.has(r.customer_name)) return false
      // 同名のauto entry (activation_record_id あり) が既にある場合も除外
      if (filtered.some(o => o.activation_record_id !== null && o.customer_name === r.customer_name)) return false
      seenManualNames.add(r.customer_name)
      return true
    }
  })

  // 苗字だけのエントリを除外（同じ結果内にフルネームが存在する場合）
  const deduped = distinct.filter(row =>
    !distinct.some(other =>
      other.id !== row.id &&
      other.customer_name.startsWith(row.customer_name) &&
      other.customer_name.length > row.customer_name.length
    )
  )
  return NextResponse.json(deduped)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { year, month, activation_date, customer_name, line_type, construction_type, status } = await req.json()
  const row = await dbQueryOne(
    `INSERT INTO opening_calendar (user_id, year, month, activation_date, customer_name, line_type, construction_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [session.userId, year, month, activation_date ?? '', customer_name ?? '', line_type ?? '', construction_type ?? '', status ?? '']
  )
  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { id, activation_date, customer_name, line_type, construction_type, status } = await req.json()
  await dbRun(
    `UPDATE opening_calendar
     SET activation_date = $1, customer_name = $2, line_type = $3, construction_type = $4, status = $5
     WHERE id = $6 AND user_id = $7`,
    [activation_date, customer_name, line_type, construction_type ?? '', status, id, session.userId]
  )
  if (status === '○') await awardBadges(session.userId)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get('id') ?? '0')
  await dbRun('DELETE FROM opening_calendar WHERE id = $1 AND user_id = $2', [id, session.userId])
  return NextResponse.json({ ok: true })
}
