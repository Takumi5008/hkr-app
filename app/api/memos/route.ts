import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const memos = await dbQuery(
    'SELECT * FROM memos WHERE user_id = $1 ORDER BY updated_at DESC',
    [session.userId]
  )
  return NextResponse.json(memos)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { title, content } = await req.json()
  const result = await dbRun(
    `INSERT INTO memos (user_id, title, content) VALUES ($1, $2, $3) RETURNING id`,
    [session.userId, title ?? '', content ?? '']
  )
  const memo = await dbQuery('SELECT * FROM memos WHERE id = $1', [result.id])
  return NextResponse.json(memo[0])
}
