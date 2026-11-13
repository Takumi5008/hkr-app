import { NextRequest, NextResponse } from 'next/server'
import { dbQuery, dbRun } from '@/lib/db'
import { requireReachManager, toMember, validateReachInput, type ReachRow } from '@/lib/reachServer'

// 78解除到達管理の一覧（集計・予測はクライアント側で lib/reach を使って計算）
export async function GET() {
  const denied = await requireReachManager()
  if (denied) return denied
  const rows = await dbQuery<ReachRow>('SELECT * FROM reach_members ORDER BY start_date, id')
  return NextResponse.json({ members: rows.map(toMember) })
}

export async function POST(req: NextRequest) {
  const denied = await requireReachManager()
  if (denied) return denied
  const v = validateReachInput(await req.json())
  if ('error' in v) return NextResponse.json({ error: v.error }, { status: 400 })
  const { id } = await dbRun(
    `INSERT INTO reach_members (name, start_date, end_date, planned_end, monthly, challenger, grade, note, paused, pause_start, resume_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    v.values
  )
  return NextResponse.json({ ok: true, id })
}
