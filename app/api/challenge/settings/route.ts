import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  const rows = await dbQuery('SELECT goal FROM challenge_settings WHERE year = $1 AND month = $2', [year, month])
  return NextResponse.json({ goal: rows[0]?.goal ?? 200 })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'admin') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { year, month, goal } = await req.json()
  await dbRun(
    `INSERT INTO challenge_settings (year, month, goal) VALUES ($1, $2, $3)
     ON CONFLICT (year, month) DO UPDATE SET goal = $3`,
    [year, month, goal]
  )
  return NextResponse.json({ ok: true })
}
