import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

// 工事日を使う種別（TYPE_NA_FIELDS で construction_date が対象外になっていないもの）
const CONSTRUCTION_TYPES = ['sonet', 'nifty', 'sbhikari']

export interface OverviewItem {
  id: number
  type: string
  name: string
  user_id: number
  staff_name: string
  updated_at: string
  reason: 'construction_unconfirmed' | 'activation_missing' | 'update_overdue' | 'review_pending'
}

// year/month/userId の任意フィルタを "AND ..." 文字列として組み立てる。
// placeholder は baseOffset（それまでに使った $ の数）から振り直す。
function buildFilter(baseOffset: number, year: string | null, month: string | null, userId: string | null) {
  const clauses: string[] = []
  const params: (string | number)[] = []
  let n = baseOffset
  if (year && month) {
    n += 1; clauses.push(`ar.year = $${n}`); params.push(Number(year))
    n += 1; clauses.push(`ar.month = $${n}`); params.push(Number(month))
  }
  if (userId) {
    n += 1; clauses.push(`ar.user_id = $${n}`); params.push(Number(userId))
  }
  return { sql: clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : '', params }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const isManager = session.role === 'manager' || session.role === 'admin' || session.role === 'viewer'
  if (!isManager) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const userIdParam = searchParams.get('userId')

  type Row = { id: number; type: string; name: string; user_id: number; staff_name: string; updated_at: string }

  // 工事日未確認: 工事日ベースの種別で、工事日は入っているが construction_date_done が未確認(≠1)、かつ開通未確定
  const typesPh = CONSTRUCTION_TYPES.map((_, i) => `$${i + 1}`).join(', ')
  const f1 = buildFilter(CONSTRUCTION_TYPES.length, year, month, userIdParam)
  const constructionUnconfirmed = await dbQuery<Row>(
    `SELECT ar.id, ar.type, ar.name, ar.user_id, u.name AS staff_name, ar.updated_at
     FROM activation_records ar JOIN users u ON u.id = ar.user_id
     WHERE ar.type IN (${typesPh})
       AND ar.construction_date != '' AND ar.construction_date != '未定'
       AND ar.construction_date_done != 1
       AND (ar.activation IS NULL OR ar.activation = '')
       ${f1.sql}
     ORDER BY ar.construction_date ASC`,
    [...CONSTRUCTION_TYPES, ...f1.params]
  )

  // 開通結果未入力: activation が未入力のまま
  const f2 = buildFilter(0, year, month, userIdParam)
  const activationMissing = await dbQuery<Row>(
    `SELECT ar.id, ar.type, ar.name, ar.user_id, u.name AS staff_name, ar.updated_at
     FROM activation_records ar JOIN users u ON u.id = ar.user_id
     WHERE (ar.activation IS NULL OR ar.activation = '') ${f2.sql}
     ORDER BY ar.id DESC`,
    f2.params
  )

  // 更新期限超過: 未完了（開通結果未入力）かつ7日以上更新が無い
  const f3 = buildFilter(0, year, month, userIdParam)
  const updateOverdue = await dbQuery<Row>(
    `SELECT ar.id, ar.type, ar.name, ar.user_id, u.name AS staff_name, ar.updated_at
     FROM activation_records ar JOIN users u ON u.id = ar.user_id
     WHERE (ar.activation IS NULL OR ar.activation = '')
       AND (ar.updated_at = '' OR ar.updated_at < TO_CHAR(NOW() - INTERVAL '7 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
       ${f3.sql}
     ORDER BY ar.updated_at ASC`,
    f3.params
  )

  // 他者確認待ち: 完了済み（開通結果が入っている）だが未確認
  const f4 = buildFilter(0, year, month, userIdParam)
  const reviewPending = await dbQuery<Row>(
    `SELECT ar.id, ar.type, ar.name, ar.user_id, u.name AS staff_name, ar.updated_at
     FROM activation_records ar JOIN users u ON u.id = ar.user_id
     WHERE ar.activation IN ('○', '×') AND ar.review_status != '○' ${f4.sql}
     ORDER BY ar.updated_at ASC`,
    f4.params
  )

  const items: OverviewItem[] = [
    ...constructionUnconfirmed.map((r) => ({ ...r, reason: 'construction_unconfirmed' as const })),
    ...activationMissing.map((r) => ({ ...r, reason: 'activation_missing' as const })),
    ...updateOverdue.map((r) => ({ ...r, reason: 'update_overdue' as const })),
    ...reviewPending.map((r) => ({ ...r, reason: 'review_pending' as const })),
  ]

  return NextResponse.json({
    items,
    counts: {
      constructionUnconfirmed: constructionUnconfirmed.length,
      activationMissing: activationMissing.length,
      updateOverdue: updateOverdue.length,
      reviewPending: reviewPending.length,
    },
  })
}
