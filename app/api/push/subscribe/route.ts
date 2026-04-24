import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbRun, dbQuery } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const subscription = await req.json()
  await dbRun(
    `INSERT INTO push_subscriptions (user_id, subscription)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET subscription = $2`,
    [session.userId, JSON.stringify(subscription)]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  await dbRun(`DELETE FROM push_subscriptions WHERE user_id = $1`, [session.userId])
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const rows = await dbQuery(`SELECT subscription FROM push_subscriptions WHERE user_id = $1`, [session.userId])
  return NextResponse.json({ subscribed: rows.length > 0 })
}
