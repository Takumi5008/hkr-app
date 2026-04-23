import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  // monthly_team_stats を優先し、なければ records の集計を使用
  const rows = await dbQuery<{
    year: number
    month: number
    total_activation: string
    total_cancel: string
    member_count: string
    note: string
  }>(
    `WITH manual AS (
       SELECT year, month, total_activation, total_cancel, member_count, note
       FROM monthly_team_stats
     ),
     from_records AS (
       SELECT year, month,
              SUM(activation_count) AS total_activation,
              SUM(cancel_count)     AS total_cancel,
              0                     AS member_count,
              ''                    AS note
       FROM records
       GROUP BY year, month
     )
     SELECT
       COALESCE(m.year,  r.year)             AS year,
       COALESCE(m.month, r.month)            AS month,
       COALESCE(m.total_activation, r.total_activation) AS total_activation,
       COALESCE(m.total_cancel,     r.total_cancel)     AS total_cancel,
       COALESCE(m.member_count,     r.member_count)     AS member_count,
       COALESCE(m.note, r.note)                         AS note
     FROM manual m
     FULL OUTER JOIN from_records r ON m.year = r.year AND m.month = r.month
     ORDER BY year DESC, month DESC`,
    []
  )

  return NextResponse.json(
    rows.map((r) => ({
      year:            Number(r.year),
      month:           Number(r.month),
      totalActivation: Number(r.total_activation),
      totalCancel:     Number(r.total_cancel),
      memberCount:     Number(r.member_count),
      note:            r.note ?? '',
    }))
  )
}
