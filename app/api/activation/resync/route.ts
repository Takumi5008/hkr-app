import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne, dbRun } from '@/lib/db'

// WiMAX獲得日ベースの開通日計算：2026年5月以前は獲得日そのまま、6月以降は+7日
function wimaxActivationDate(baseDate: string, year: number, month: number): string {
  if (!baseDate || baseDate === '未定' || baseDate === '-' || baseDate.trim() === '') return ''
  if (year < 2026 || (year === 2026 && month <= 5)) return baseDate
  const d = new Date(baseDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString().slice(0, 10)
}

// 全レコードの開通カレンダーを再同期する
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const isManager = session.role === 'manager' || session.role === 'admin'
  if (!isManager) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const records = await dbQuery<{
    id: number; user_id: number; type: string; name: string; construction_type: string
    week_after: string; construction_date: string; week_after_delivery: string
    date: string; delivery_date: string; delivery_date_done: number
    activation: string; cancel: string; year: number; month: number
  }>(
    `SELECT id, user_id, type, name, construction_type, week_after, construction_date,
     week_after_delivery, date, delivery_date, delivery_date_done,
     activation, cancel, year, month
     FROM activation_records`,
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
    // タイプ別トリガー判定と開通日計算
    let shouldSync = false
    let activationDate = ''

    if (rec.type === 'sonet') {
      shouldSync = rec.cancel === '○'
      activationDate = rec.construction_date
    } else if (rec.type === 'wimax_direct') {
      shouldSync = !!(rec.date && rec.date !== '-' && rec.date !== '未定' && rec.date.trim() !== '')
      activationDate = rec.date  // 直せちは獲得日＝開通日なので+7日しない
    } else {
      // wimax_post
      shouldSync = rec.delivery_date_done >= 1
      activationDate = rec.delivery_date  // 後送りは配送日そのまま
    }

    if (!shouldSync || !activationDate || activationDate === '未定' || activationDate === '-' || activationDate.trim() === '') {
      await dbRun('DELETE FROM opening_calendar WHERE activation_record_id = $1', [rec.id])
      continue
    }

    const lineType = rec.type === 'sonet' ? '🍑' : '🏠'
    const status = rec.activation === '○' ? '○' : rec.activation === '×' ? '×' : ''

    // M/D 形式 → 2026-MM-DD に正規化（全て2026年として扱う）
    const mdMatch = (activationDate ?? '').match(/^(\d{1,2})[\/月](\d{1,2})$/)
    if (mdMatch) {
      const m = String(parseInt(mdMatch[1])).padStart(2, '0')
      const d = String(parseInt(mdMatch[2])).padStart(2, '0')
      activationDate = `2026-${m}-${d}`
    }

    // 業務月: 開通日の日が25以上なら当月、24以下なら前月
    const dateMatch = (activationDate ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
    let calYear: number
    let calMonth: number
    if (dateMatch) {
      const day = parseInt(dateMatch[3])
      if (day >= 25) {
        calYear = parseInt(dateMatch[1])
        calMonth = parseInt(dateMatch[2])
      } else {
        const rawMonth = parseInt(dateMatch[2])
        if (rawMonth === 1) { calYear = parseInt(dateMatch[1]) - 1; calMonth = 12 }
        else { calYear = parseInt(dateMatch[1]); calMonth = rawMonth - 1 }
      }
    } else {
      calYear = rec.year
      calMonth = rec.month
    }

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
