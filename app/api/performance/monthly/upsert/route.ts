import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbRun, dbQuery } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { year, month, totalActivation, totalCancel, memberCount, note } = await req.json()

  await dbRun(
    `INSERT INTO monthly_team_stats (year, month, total_activation, total_cancel, member_count, note)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (year, month) DO UPDATE SET
       total_activation = EXCLUDED.total_activation,
       total_cancel     = EXCLUDED.total_cancel,
       member_count     = EXCLUDED.member_count,
       note             = EXCLUDED.note`,
    [year, month, totalActivation ?? 0, totalCancel ?? 0, memberCount ?? 0, note ?? '']
  )

  const rows = await dbQuery(
    'SELECT * FROM monthly_team_stats WHERE year=$1 AND month=$2',
    [year, month]
  )
  return NextResponse.json(rows[0])
}
