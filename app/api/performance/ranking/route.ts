import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  // 直近3ヶ月の year/month ペアを計算
  const months3: { year: number; month: number }[] = []
  for (let i = 2; i >= 0; i--) {
    let m = month - i
    let y = year
    if (m <= 0) { m += 12; y -= 1 }
    months3.push({ year: y, month: m })
  }

  try {
    const [monthlyCancel, last3Opening] = await Promise.all([
      // 当月の解除時間生産性ランキング
      dbQuery<{ member_name: string; total_cancel: number; work_hours: number; productivity: number }>(
        `SELECT member_name, total_cancel, work_hours,
                ROUND((total_cancel::numeric / work_hours), 3) AS productivity
         FROM member_monthly_stats
         WHERE year = $1 AND month = $2 AND work_hours > 0
         ORDER BY productivity DESC`,
        [year, month]
      ),
      // 直近3ヶ月の開通時間生産性ランキング（OR条件で互換性確保）
      dbQuery<{ member_name: string; total_opening: number; total_hours: number; hours_per_opening: number }>(
        `SELECT member_name,
                SUM(opening_count)::int AS total_opening,
                SUM(work_hours) AS total_hours,
                ROUND(SUM(work_hours)::numeric / NULLIF(SUM(opening_count), 0), 2) AS hours_per_opening
         FROM member_monthly_stats
         WHERE (
           (year = $1 AND month = $2) OR
           (year = $3 AND month = $4) OR
           (year = $5 AND month = $6)
         )
         GROUP BY member_name
         HAVING SUM(opening_count) > 0 AND SUM(work_hours) > 0
         ORDER BY hours_per_opening ASC`,
        [months3[0].year, months3[0].month, months3[1].year, months3[1].month, months3[2].year, months3[2].month]
      ),
    ])

    return NextResponse.json({ year, month, months3, monthlyCancel, last3Opening })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
