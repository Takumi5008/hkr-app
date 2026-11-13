import { NextRequest, NextResponse } from 'next/server'
import { dbRun } from '@/lib/db'
import { requireReachManager, validateReachInput } from '@/lib/reachServer'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireReachManager()
  if (denied) return denied
  const id = Number((await params).id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'id が不正です' }, { status: 400 })
  const v = validateReachInput(await req.json())
  if ('error' in v) return NextResponse.json({ error: v.error }, { status: 400 })
  const { rowCount } = await dbRun(
    `UPDATE reach_members SET name = $1, start_date = $2, end_date = $3, planned_end = $4, monthly = $5,
       challenger = $6, grade = $7, note = $8, paused = $9, pause_start = $10, resume_date = $11, updated_at = TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
     WHERE id = $12`,
    [...v.values, id]
  )
  if (rowCount === 0) return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireReachManager()
  if (denied) return denied
  const id = Number((await params).id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'id が不正です' }, { status: 400 })
  await dbRun('DELETE FROM reach_members WHERE id = $1', [id])
  return NextResponse.json({ ok: true })
}
