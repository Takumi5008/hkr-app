import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne, dbRun } from '@/lib/db'
import { addPointTransaction, removePointTransaction } from '@/lib/points'

// WiMAX獲得日ベースの開通日計算：2026年5月以前は獲得日そのまま、6月以降は+7日
function wimaxActivationDate(baseDate: string, year: number, month: number): string {
  if (!baseDate || baseDate === '未定' || baseDate === '-' || baseDate.trim() === '') return ''
  if (year < 2026 || (year === 2026 && month <= 5)) return baseDate
  const d = new Date(baseDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString().slice(0, 10)
}

async function syncCalendar(userId: number, recordId: number) {
  const rec = await dbQueryOne<{
    id: number; type: string; name: string; construction_type: string
    week_after: string; construction_date: string; week_after_delivery: string
    date: string; delivery_date: string; delivery_date_done: number
    activation: string; cancel: string; year: number; month: number; user_id: number
  }>(
    `SELECT id, type, name, construction_type, week_after, construction_date,
     week_after_delivery, date, delivery_date, delivery_date_done,
     activation, cancel, year, month, user_id
     FROM activation_records WHERE id = $1`,
    [recordId]
  )
  if (!rec) return

  const ownerUserId = rec.user_id

  const existing = await dbQueryOne<{ id: number }>(
    'SELECT id FROM opening_calendar WHERE activation_record_id = $1 AND user_id = $2',
    [recordId, ownerUserId]
  )

  // タイプ別トリガー判定
  let shouldSync = false
  let activationDate = ''

  if (rec.type === 'sonet') {
    // So-net: 解除⭕️のときのみ
    shouldSync = rec.cancel === '○'
    activationDate = rec.construction_date
  } else if (rec.type === 'wimax_direct') {
    // WiMAX直せち: 置いたら（date設定時）カレンダーへ
    shouldSync = !!(rec.date && rec.date !== '-' && rec.date !== '未定' && rec.date.trim() !== '')
    activationDate = wimaxActivationDate(rec.date, rec.year, rec.month)
  } else {
    // WiMAX後送り: 受取日に⭕️ついたらカレンダーへ
    shouldSync = rec.delivery_date_done >= 1
    activationDate = wimaxActivationDate(rec.delivery_date, rec.year, rec.month)
  }

  if (!shouldSync || !activationDate || activationDate === '未定' || activationDate === '-' || activationDate.trim() === '') {
    if (existing) await dbRun('DELETE FROM opening_calendar WHERE id = $1', [existing.id])
    return
  }

  const lineType = rec.type === 'sonet' ? '🍑' : '🏠'
  const status = rec.activation === '○' ? '○' : rec.activation === '×' ? '×' : ''

  const dateMatch = activationDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const calYear = dateMatch ? parseInt(dateMatch[1]) : rec.year
  const calMonth = dateMatch ? parseInt(dateMatch[2]) : rec.month

  if (existing) {
    await dbRun(
      `UPDATE opening_calendar
       SET activation_date=$1, customer_name=$2, line_type=$3, construction_type=$4,
           year=$5, month=$6, status=$7
       WHERE id=$8`,
      [activationDate, rec.name, lineType, rec.construction_type, calYear, calMonth, status, existing.id]
    )
  } else {
    await dbRun(
      `INSERT INTO opening_calendar
       (user_id, year, month, activation_date, customer_name, line_type, construction_type, activation_record_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [ownerUserId, calYear, calMonth, activationDate, rec.name, lineType, rec.construction_type, recordId, status]
    )
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  const type = searchParams.get('type')
  if (!year || !month || !type) return NextResponse.json({ error: 'パラメータ不足' }, { status: 400 })

  const isManager = session.role === 'manager' || session.role === 'viewer' || session.role === 'admin'
  const targetUserId = isManager && searchParams.get('userId') ? searchParams.get('userId') : session.userId

  if (type === 'all') {
    const rows = await dbQuery(
      `SELECT * FROM activation_records
       WHERE user_id=$1 AND year=$2 AND month=$3
       ORDER BY date ASC, id ASC`,
      [targetUserId, year, month]
    )
    return NextResponse.json(rows)
  }

  const rows = await dbQuery(
    `SELECT * FROM activation_records
     WHERE user_id=$1 AND type=$2 AND year=$3 AND month=$4
     ORDER BY id ASC`,
    [targetUserId, type, year, month]
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const body = await req.json()
  const { year, month, type, name, date, line, cancel, cancel_reason, neg_apply, neg_cancel, fm,
    week_after, day_before_construction, construction_date, day_before_delivery, delivery_date,
    week_after_delivery, activation, construction_type,
    cancel_appt, callback_info, construction_time } = body

  const result = await dbRun(
    `INSERT INTO activation_records
     (user_id, year, month, type, name, date, line, cancel, cancel_reason, neg_apply, neg_cancel, fm,
      week_after, day_before_construction, construction_date, day_before_delivery, delivery_date,
      week_after_delivery, activation, construction_type, cancel_appt, callback_info, construction_time)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
     RETURNING id`,
    [session.userId, year, month, type, name ?? '', date ?? '', line ?? '', cancel ?? '', cancel_reason ?? '',
     neg_apply ?? '', neg_cancel ?? '', fm ?? '', week_after ?? '',
     day_before_construction ?? '', construction_date ?? '',
     day_before_delivery ?? '', delivery_date ?? '', week_after_delivery ?? '', activation ?? '',
     construction_type ?? '', cancel_appt ?? '', callback_info ?? '', construction_time ?? '']
  )

  if (result.id) await syncCalendar(session.userId as number, result.id)
  return NextResponse.json({ id: result.id })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const body = await req.json()
  const { id, name, date, line, cancel, cancel_reason, neg_apply, neg_cancel, fm,
    week_after, day_before_construction, construction_date, day_before_delivery, delivery_date,
    week_after_delivery, activation, construction_type,
    cancel_appt, callback_info, construction_time } = body

  const isManager = session.role === 'manager' || session.role === 'admin'

  // マネージャーは他ユーザーのレコードも編集可、メンバーは自分のみ
  const prev = await dbQueryOne<{ activation: string; cancel: string; neg_apply: string; neg_cancel: string; date: string; user_id: number }>(
    isManager
      ? 'SELECT activation, cancel, neg_apply, neg_cancel, date, user_id FROM activation_records WHERE id=$1'
      : 'SELECT activation, cancel, neg_apply, neg_cancel, date, user_id FROM activation_records WHERE id=$1 AND user_id=$2',
    isManager ? [id] : [id, session.userId]
  )
  if (!prev) return NextResponse.json({ ok: true })

  const recordOwnerId = prev.user_id

  await dbRun(
    `UPDATE activation_records SET
     name=$1, date=$2, line=$3, cancel=$4, cancel_reason=$5, neg_apply=$6, neg_cancel=$7, fm=$8,
     week_after=$9, day_before_construction=$10, construction_date=$11,
     day_before_delivery=$12, delivery_date=$13, week_after_delivery=$14, activation=$15,
     construction_type=$16, cancel_appt=$17, callback_info=$18, construction_time=$19
     WHERE id=$20`,
    [name ?? '', date ?? '', line ?? '', cancel ?? '', cancel_reason ?? '', neg_apply ?? '', neg_cancel ?? '', fm ?? '',
     week_after ?? '', day_before_construction ?? '', construction_date ?? '',
     day_before_delivery ?? '', delivery_date ?? '', week_after_delivery ?? '', activation ?? '',
     construction_type ?? '', cancel_appt ?? '', callback_info ?? '', construction_time ?? '',
     id]
  )

  await syncCalendar(recordOwnerId, id)

  // ポイントはレコードオーナーに付与
  // 開通⭕️トグル: +5pt / -5pt
  if (activation && !prev?.activation) {
    await removePointTransaction(recordOwnerId, 'activation_mark', String(id))
    await addPointTransaction(recordOwnerId, 5, '開通確認', 'activation_mark', String(id))
  } else if (!activation && prev?.activation) {
    await removePointTransaction(recordOwnerId, 'activation_mark', String(id))
  }

  // 解除⭕️トグル: +1pt / -1pt
  if (cancel && !prev?.cancel) {
    await removePointTransaction(recordOwnerId, 'cancel_mark', String(id))
    await addPointTransaction(recordOwnerId, 1, '解除確認', 'cancel_mark', String(id))
  } else if (!cancel && prev?.cancel) {
    await removePointTransaction(recordOwnerId, 'cancel_mark', String(id))
  }

  // 申込時ネガキャン⭕️トグル: +1pt / -1pt
  if (neg_apply && !prev?.neg_apply) {
    await removePointTransaction(recordOwnerId, 'neg_apply_mark', String(id))
    await addPointTransaction(recordOwnerId, 1, '申込時ネガキャン確認', 'neg_apply_mark', String(id))
  } else if (!neg_apply && prev?.neg_apply) {
    await removePointTransaction(recordOwnerId, 'neg_apply_mark', String(id))
  }

  // 解除時ネガキャン⭕️トグル: +1pt / -1pt
  if (neg_cancel && !prev?.neg_cancel) {
    await removePointTransaction(recordOwnerId, 'neg_cancel_mark', String(id))
    await addPointTransaction(recordOwnerId, 1, '解除時ネガキャン確認', 'neg_cancel_mark', String(id))
  } else if (!neg_cancel && prev?.neg_cancel) {
    await removePointTransaction(recordOwnerId, 'neg_cancel_mark', String(id))
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id不足' }, { status: 400 })

  // リンクされた開通カレンダーエントリを削除
  await dbRun(
    'DELETE FROM opening_calendar WHERE activation_record_id = $1 AND user_id = $2',
    [id, session.userId]
  )
  await dbRun(`DELETE FROM activation_records WHERE id=$1 AND user_id=$2`, [id, session.userId])
  return NextResponse.json({ ok: true })
}
