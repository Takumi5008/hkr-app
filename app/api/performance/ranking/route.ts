import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  try {
    const monthlyCancel = await dbQuery<{ member_name: string; total_cancel: number; work_hours: number; productivity: number }>(
      `SELECT u.name AS member_name,
              SUM(da.cancel)::int AS total_cancel,
              ROUND(SUM(CASE WHEN TRANSLATE(da.work_hours,'０１２３４５６７８９。','0123456789.') ~ '^[0-9]+(\.[0-9]+)?$' THEN TRANSLATE(da.work_hours,'０１２３４５６７８９。','0123456789.')::numeric ELSE NULL END), 2) AS work_hours,
              ROUND(SUM(da.cancel)::numeric / NULLIF(SUM(CASE WHEN TRANSLATE(da.work_hours,'０１２３４５６７８９。','0123456789.') ~ '^[0-9]+(\.[0-9]+)?$' THEN TRANSLATE(da.work_hours,'０１２３４５６７８９。','0123456789.')::numeric ELSE NULL END), 0), 3) AS productivity
       FROM daily_activity da
       JOIN users u ON u.id = da.user_id
       WHERE EXTRACT(YEAR FROM da.date::date) = $1
         AND EXTRACT(MONTH FROM da.date::date) = $2
         AND u.role != 'viewer'
       GROUP BY u.name
       HAVING SUM(CASE WHEN TRANSLATE(da.work_hours,'０１２３４５６７８９。','0123456789.') ~ '^[0-9]+(\.[0-9]+)?$' THEN TRANSLATE(da.work_hours,'０１２３４５６７８９。','0123456789.')::numeric ELSE NULL END) > 0
       ORDER BY productivity DESC`,
      [year, month]
    )

    return NextResponse.json({ year, month, monthlyCancel })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
