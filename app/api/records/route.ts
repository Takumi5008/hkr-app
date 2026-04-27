import { NextRequest, NextResponse } from 'next/server'
import { dbQuery, dbQueryOne, dbRun } from '@/lib/db'
import { getSession } from '@/lib/session'
import { syncUserPoints, addPointTransaction } from '@/lib/points'

const ACTIVATION_MILESTONES: { threshold: number; bonus: number }[] = [
  { threshold: 7,  bonus: 20  },
  { threshold: 15, bonus: 50  },
  { threshold: 20, bonus: 100 },
]

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || String(session.userId)
  const year = searchParams.get('year')
  const month = searchParams.get('month')

  if (String(userId) !== String(session.userId) && session.role === 'member') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let sql = 'SELECT * FROM records WHERE user_id = $1'
  const params: (string | number)[] = [userId]
  let idx = 2

  if (year) { sql += ` AND year = $${idx++}`; params.push(Number(year)) }
  if (month) { sql += ` AND month = $${idx++}`; params.push(Number(month)) }
  sql += ' ORDER BY year DESC, month DESC'

  const records = await dbQuery(sql, params)
  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { year, month, product, cancel_count, activation_count } = await req.json()

  await dbRun(`
    INSERT INTO records (user_id, year, month, product, cancel_count, activation_count, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    ON CONFLICT(user_id, year, month, product)
    DO UPDATE SET cancel_count = EXCLUDED.cancel_count,
                  activation_count = EXCLUDED.activation_count,
                  updated_at = TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  `, [session.userId, year, month, product, cancel_count ?? 0, activation_count ?? 0])

  // 月合計開通数を集計してマイルストーンボーナスを付与
  const totals = await dbQueryOne<{ total: number }>(
    `SELECT COALESCE(SUM(activation_count), 0)::int AS total
     FROM records WHERE user_id = $1 AND year = $2 AND month = $3`,
    [session.userId, year, month]
  )
  const total = totals?.total ?? 0
  for (const { threshold, bonus } of ACTIVATION_MILESTONES) {
    if (total >= threshold) {
      await addPointTransaction(
        session.userId as number, bonus,
        `月${threshold}開通ボーナス`,
        'milestone',
        `${session.userId}-${year}-${month}-${threshold}`
      )
    }
  }

  await syncUserPoints(session.userId as number)

  const record = await dbQueryOne(
    'SELECT * FROM records WHERE user_id = $1 AND year = $2 AND month = $3 AND product = $4',
    [session.userId, year, month, product]
  )

  return NextResponse.json(record)
}
