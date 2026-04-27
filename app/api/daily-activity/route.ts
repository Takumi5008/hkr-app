import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month')
  if (!year || !month) return NextResponse.json({ error: 'パラメータ不足' }, { status: 400 })

  const isManager = session.role === 'manager' || session.role === 'viewer'
  const userId = searchParams.get('userId')

  // 全員集計モード
  if (userId === 'all') {
    if (!isManager) return NextResponse.json({ error: '権限なし' }, { status: 403 })
    const rows = await dbQuery(
      `SELECT
         u.id AS user_id, u.name,
         COUNT(CASE WHEN da.work_hours IS NOT NULL AND da.work_hours != '' THEN 1 END)::int AS work_days,
         ROUND(COALESCE(SUM(CASE WHEN da.work_hours ~ '^[0-9]+(\\.[0-9]+)?$' THEN da.work_hours::numeric END), 0), 1) AS work_hours,
         COALESCE(SUM(da.pin_count), 0)::int      AS pin_count,
         COALESCE(SUM(da.pingpong_count), 0)::int AS pingpong_count,
         COALESCE(SUM(da.intercom_count), 0)::int AS intercom_count,
         COALESCE(SUM(da.face_other), 0)::int     AS face_other,
         COALESCE(SUM(da.face_unused), 0)::int    AS face_unused,
         COALESCE(SUM(da.hearing_sheet), 0)::int  AS hearing_sheet,
         COALESCE(SUM(da.consent_form), 0)::int   AS consent_form,
         COALESCE(SUM(da.wimax), 0)::int          AS wimax,
         COALESCE(SUM(da.sonet), 0)::int          AS sonet,
         COALESCE(SUM(da.cancel), 0)::int         AS cancel
       FROM users u
       LEFT JOIN daily_activity da ON da.user_id = u.id AND da.date LIKE $1
       WHERE u.role != 'viewer'
       GROUP BY u.id, u.name
       ORDER BY u.name ASC`,
      [`${year}-${String(month).padStart(2, '0')}-%`]
    )
    return NextResponse.json(rows)
  }

  const targetUserId = isManager && userId ? userId : session.userId

  const rows = await dbQuery(
    `SELECT * FROM daily_activity WHERE user_id=$1 AND date LIKE $2 ORDER BY date ASC`,
    [targetUserId, `${year}-${String(month).padStart(2, '0')}-%`]
  )
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { date, workHours, pinCount, pingpongCount, intercomCount, faceOther, faceUnused, hearingSheet, consentForm, wimax, sonet, cancel } = await req.json()

  await dbRun(
    `INSERT INTO daily_activity
     (user_id, date, work_hours, pin_count, pingpong_count, intercom_count, face_other, face_unused, hearing_sheet, consent_form, wimax, sonet, cancel)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (user_id, date) DO UPDATE SET
       work_hours=$3, pin_count=$4, pingpong_count=$5, intercom_count=$6,
       face_other=$7, face_unused=$8, hearing_sheet=$9, consent_form=$10,
       wimax=$11, sonet=$12, cancel=$13`,
    [session.userId, date, workHours ?? '', pinCount ?? 0, pingpongCount ?? 0, intercomCount ?? 0,
     faceOther ?? 0, faceUnused ?? 0, hearingSheet ?? 0, consentForm ?? 0, wimax ?? 0, sonet ?? 0, cancel ?? 0]
  )

  const rows = await dbQuery(
    `SELECT * FROM daily_activity WHERE user_id=$1 AND date LIKE $2 ORDER BY date ASC`,
    [session.userId, `${date.slice(0, 7)}-%`]
  )
  return NextResponse.json(rows)
}
