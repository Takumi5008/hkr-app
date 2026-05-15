import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne, dbRun } from '@/lib/db'

// 全ての cancel='○' レコードの開通カレンダーを正しいオーナーに再同期する
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const isManager = session.role === 'manager' || session.role === 'admin'
  if (!isManager) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const records = await dbQuery<{
    id: number; user_id: number; type: string; name: string; construction_type: string
    week_after: string; construction_date: string; week_after_delivery: string
    activation: string; cancel: string; year: number; month: number
  }>(
    `SELECT id, user_id, type, name, construction_type, week_after, construction_date,
     week_after_delivery, activation, cancel, year, month
     FROM activation_records WHERE cancel = '○'`,
    []
  )

  // 苗字だけのエントリを削除（同一 user/year/month 内にフルネームが存在する場合）
  await dbRun(
    `DELETE FROM opening_calendar
     WHERE id IN (
       SELECT oc1.id FROM opening_calendar oc1
       JOIN opening_calendar oc2
         ON oc1.user_id = oc2.user_id
         AND oc1.year = oc2.year
         AND oc1.month = oc2.month
         AND oc1.id != oc2.id
         AND oc2.customer_name LIKE oc1.customer_name || '%'
         AND char_length(oc2.customer_name) > char_length(oc1.customer_name)
     )`,
    []
  )

  // 同一 (user_id, customer_name, year, month) の重複エントリを物理削除
  // activation_record_id ありを優先し、古い手動入力の重複を除去する
  await dbRun(
    `DELETE FROM opening_calendar
     WHERE id NOT IN (
       SELECT DISTINCT ON (user_id, customer_name, year, month) id
       FROM opening_calendar
       ORDER BY user_id, customer_name, year, month,
                (activation_record_id IS NOT NULL) DESC,
                created_at ASC
     )`,
    []
  )

  let synced = 0
  for (const rec of records) {
    const activationDate = rec.type === 'sonet' ? rec.construction_date
      : rec.type === 'wimax_direct' ? rec.week_after
      : rec.week_after_delivery

    // 未定・ハイフン・空欄はスキップ
    if (!activationDate || activationDate === '未定' || activationDate === '-' || activationDate.trim() === '') {
      await dbRun('DELETE FROM opening_calendar WHERE activation_record_id = $1', [rec.id])
      continue
    }

    const lineType = rec.type === 'sonet' ? '🍑' : '🏠'
    const status = rec.activation === '○' ? '○' : ''

    const dateMatch = (activationDate ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
    const calYear = dateMatch ? parseInt(dateMatch[1]) : rec.year
    const calMonth = dateMatch ? parseInt(dateMatch[2]) : rec.month

    // 正しいオーナーのエントリを探す
    const correct = await dbQueryOne<{ id: number }>(
      'SELECT id FROM opening_calendar WHERE activation_record_id = $1 AND user_id = $2',
      [rec.id, rec.user_id]
    )
    // 間違ったオーナーのエントリを削除
    await dbRun(
      'DELETE FROM opening_calendar WHERE activation_record_id = $1 AND user_id != $2',
      [rec.id, rec.user_id]
    )

    if (correct) {
      await dbRun(
        `UPDATE opening_calendar
         SET activation_date=$1, customer_name=$2, line_type=$3, construction_type=$4,
             year=$5, month=$6, status=$7
         WHERE id=$8`,
        [activationDate, rec.name, lineType, rec.construction_type, calYear, calMonth, status, correct.id]
      )
    } else {
      await dbRun(
        `INSERT INTO opening_calendar
         (user_id, year, month, activation_date, customer_name, line_type, construction_type, activation_record_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [rec.user_id, calYear, calMonth, activationDate, rec.name, lineType, rec.construction_type, rec.id, status]
      )
    }
    synced++
  }

  return NextResponse.json({ ok: true, synced })
}
