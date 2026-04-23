import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const rows = await dbQuery<{
    year: number
    month: number
    total_activation: string
    total_cancel: string
  }>(
    `SELECT year, month,
            SUM(activation_count) AS total_activation,
            SUM(cancel_count)     AS total_cancel
     FROM records
     GROUP BY year, month
     ORDER BY year DESC, month DESC`,
    []
  )

  return NextResponse.json(
    rows.map((r) => ({
      year: Number(r.year),
      month: Number(r.month),
      totalActivation: Number(r.total_activation),
      totalCancel: Number(r.total_cancel),
    }))
  )
}
