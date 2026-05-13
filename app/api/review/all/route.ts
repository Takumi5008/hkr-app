import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')
  if (!year || !month) return NextResponse.json({ error: 'year と month を指定してください' }, { status: 400 })

  const rows = await dbQuery(
    `SELECT mr.*, u.name AS user_name
     FROM monthly_reviews mr
     JOIN users u ON u.id = mr.user_id
     WHERE mr.year = $1 AND mr.month = $2
     ORDER BY mr.submitted_at ASC`,
    [year, month]
  )
  return NextResponse.json(rows)
}
