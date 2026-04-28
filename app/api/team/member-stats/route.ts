import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'viewer') return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const month = Number(searchParams.get('month') || new Date().getMonth() + 1)
  const monthStr = `${year}-${String(month).padStart(2, '0')}-%`
  const yearStr = `${year}-%`

  const [mtgRows, activityRows, loginRows, openingRows] = await Promise.all([
    dbQuery(
      `SELECT user_id,
         COUNT(CASE WHEN status='present' THEN 1 END)::int AS present_count,
         COUNT(CASE WHEN status='absent'  THEN 1 END)::int AS absent_count,
         COUNT(CASE WHEN status='late'    THEN 1 END)::int AS late_count
       FROM mtg_attendance
       WHERE date LIKE $1
       GROUP BY user_id`,
      [yearStr]
    ),
    dbQuery(
      `SELECT user_id,
         COUNT(*)::int AS entry_days,
         ROUND(COALESCE(SUM(CASE WHEN work_hours ~ '^[0-9]+(\\.[0-9]+)?$' THEN work_hours::numeric END), 0), 1)::float AS work_hours,
         COALESCE(SUM(pin_count), 0)::int      AS pin_count,
         COALESCE(SUM(pingpong_count), 0)::int AS pingpong_count,
         COALESCE(SUM(intercom_count), 0)::int AS intercom_count,
         COALESCE(SUM(hearing_sheet), 0)::int  AS hearing_sheet,
         COALESCE(SUM(consent_form), 0)::int   AS consent_form
       FROM daily_activity
       WHERE date LIKE $1
       GROUP BY user_id`,
      [monthStr]
    ),
    dbQuery(
      `SELECT id AS user_id, COALESCE(login_count, 0)::int AS login_count, last_login_at
       FROM users WHERE role != 'viewer'`
    ),
    dbQuery(
      `SELECT u.id AS user_id, COALESCE(mms.opening_count, 0)::int AS opening_count
       FROM users u
       LEFT JOIN member_monthly_stats mms
         ON mms.member_name = u.name AND mms.year = $1 AND mms.month = $2
       WHERE u.role != 'viewer'`,
      [year, month]
    ),
  ])

  return NextResponse.json({ mtg: mtgRows, activity: activityRows, login: loginRows, opening: openingRows })
}
