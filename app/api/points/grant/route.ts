import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbRun } from '@/lib/db'
import { syncUserPoints } from '@/lib/points'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限なし' }, { status: 403 })

  const { userId, delta, reason } = await req.json()
  if (!userId || !delta || delta === 0) return NextResponse.json({ error: '不正なリクエスト' }, { status: 400 })

  // manual は複数回付与できるよう ref_id に日時を入れる
  const refId = `${userId}-${Date.now()}`
  await dbRun(
    `INSERT INTO point_transactions (user_id, delta, reason, ref_type, ref_id)
     VALUES ($1, $2, $3, 'manual', $4)`,
    [userId, delta, reason ?? '管理者による付与', refId]
  )
  await syncUserPoints(userId)

  return NextResponse.json({ ok: true })
}
