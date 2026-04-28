import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthStr = `${year}-${String(month).padStart(2, '0')}-%`
  const yearStr = `${year}-%`

  const [records, mtgRows, activityRows] = await Promise.all([
    dbQuery(
      'SELECT product, activation_count, cancel_count FROM records WHERE user_id = $1 AND year = $2 AND month = $3',
      [session.userId, year, month]
    ),
    dbQuery(
      `SELECT
         COUNT(CASE WHEN status='present' THEN 1 END)::int AS present_count,
         COUNT(CASE WHEN status='absent'  THEN 1 END)::int AS absent_count,
         COUNT(CASE WHEN status='late'    THEN 1 END)::int AS late_count
       FROM mtg_attendance WHERE user_id = $1 AND date LIKE $2`,
      [session.userId, yearStr]
    ),
    dbQuery(
      `SELECT
         COUNT(*)::int AS entry_days,
         ROUND(COALESCE(SUM(CASE WHEN work_hours ~ '^[0-9]+(\\.[0-9]+)?$' THEN work_hours::numeric END), 0), 1)::float AS work_hours,
         COALESCE(SUM(pin_count), 0)::int      AS pin_count,
         COALESCE(SUM(pingpong_count), 0)::int AS pingpong_count,
         COALESCE(SUM(intercom_count), 0)::int AS intercom_count,
         COALESCE(SUM(hearing_sheet), 0)::int  AS hearing_sheet,
         COALESCE(SUM(consent_form), 0)::int   AS consent_form
       FROM daily_activity WHERE user_id = $1 AND date LIKE $2`,
      [session.userId, monthStr]
    ),
  ])

  return NextResponse.json({
    year,
    month,
    records,
    mtg: mtgRows[0] ?? { present_count: 0, absent_count: 0, late_count: 0 },
    activity: activityRows[0] ?? { entry_days: 0, work_hours: 0, pin_count: 0, pingpong_count: 0, intercom_count: 0, hearing_sheet: 0, consent_form: 0 },
  })
}
