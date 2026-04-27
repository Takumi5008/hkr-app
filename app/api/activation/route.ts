import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne, dbRun } from '@/lib/db'
import { addPointTransaction } from '@/lib/points'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const type = searchParams.get('type')
  if (!year || !month || !type) return NextResponse.json({ error: 'パラメータ不足' }, { status: 400 })

  const isManager = session.role === 'manager' || session.role === 'viewer'
  const targetUserId = isManager && searchParams.get('userId') ? searchParams.get('userId') : session.userId

  if (type === 'all') {
    const rows = await dbQuery(
      `SELECT * FROM activation_records WHERE user_id=$1 AND year=$2 AND month=$3 ORDER BY date ASC, id ASC`,
      [targetUserId, year, month]
    )
    return NextResponse.json(rows)
  }

  const rows = await dbQuery(
    `SELECT * FROM activation_records WHERE user_id=$1 AND year=$2 AND month=$3 AND type=$4 ORDER BY id ASC`,
    [targetUserId, year, month, type]
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const body = await req.json()
  const { year, month, type, name, date, line, cancel, neg_apply, neg_cancel, fm,
    week_after, day_before_construction, construction_date, day_before_delivery, delivery_date, week_after_delivery, activation } = body

  const result = await dbRun(
    `INSERT INTO activation_records
     (user_id, year, month, type, name, date, line, cancel, neg_apply, neg_cancel, fm,
      week_after, day_before_construction, construction_date, day_before_delivery, delivery_date, week_after_delivery, activation)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING id`,
    [session.userId, year, month, type, name ?? '', date ?? '', line ?? '', cancel ?? '',
     neg_apply ?? '', neg_cancel ?? '', fm ?? '', week_after ?? '',
     day_before_construction ?? '', construction_date ?? '',
     day_before_delivery ?? '', delivery_date ?? '', week_after_delivery ?? '', activation ?? '']
  )
  return NextResponse.json({ id: result.id })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const body = await req.json()
  const { id, name, date, line, cancel, neg_apply, neg_cancel, fm,
    week_after, day_before_construction, construction_date, day_before_delivery, delivery_date, week_after_delivery, activation } = body

  // 更新前の activation 状態を取得
  const prev = await dbQueryOne<{ activation: string; date: string }>(
    'SELECT activation, date FROM activation_records WHERE id=$1 AND user_id=$2',
    [id, session.userId]
  )

  await dbRun(
    `UPDATE activation_records SET
     name=$1, date=$2, line=$3, cancel=$4, neg_apply=$5, neg_cancel=$6, fm=$7,
     week_after=$8, day_before_construction=$9, construction_date=$10,
     day_before_delivery=$11, delivery_date=$12, week_after_delivery=$13, activation=$14
     WHERE id=$15 AND user_id=$16`,
    [name ?? '', date ?? '', line ?? '', cancel ?? '', neg_apply ?? '', neg_cancel ?? '', fm ?? '',
     week_after ?? '', day_before_construction ?? '', construction_date ?? '',
     day_before_delivery ?? '', delivery_date ?? '', week_after_delivery ?? '', activation ?? '',
     id, session.userId]
  )

  // ⭕️が新規に付いた場合のポイント処理
  const recordDate = (date as string) || prev?.date || ''
  if (activation && !prev?.activation) {
    // ⭕️をつけたこと自体で +1pt
    await addPointTransaction(
      session.userId as number, 1, '開通確認', 'activation_mark', String(id)
    )
    // さらに日付の21時(JST=12:00 UTC)前なら追加 +3pt
    if (recordDate) {
      const deadline21 = new Date(recordDate + 'T12:00:00Z')
      if (new Date() < deadline21) {
        await addPointTransaction(
          session.userId as number, 3, 'HKR日付21時前に開通確認', 'activation_ontime', String(id)
        )
      }
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id不足' }, { status: 400 })

  await dbRun(`DELETE FROM activation_records WHERE id=$1 AND user_id=$2`, [id, session.userId])
  return NextResponse.json({ ok: true })
}
