import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbRun, dbQuery } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const { id } = await params
  const { name, activationTarget, cancelTarget, workDaysTarget, periodStart, periodEnd, totalWork, totalActivation, totalCancel, note, sortOrder } = await req.json()
  await dbRun(
    `UPDATE member_performance SET
      name=$1, activation_target=$2, cancel_target=$3, work_days_target=$4,
      period_start=$5, period_end=$6, total_work=$7, total_activation=$8,
      total_cancel=$9, note=$10, sort_order=$11,
      updated_at=TO_CHAR(NOW(),'YYYY-MM-DD"T"HH24:MI:SS"Z"')
     WHERE id=$12`,
    [name, activationTarget ?? 0, cancelTarget ?? 0, workDaysTarget ?? 0, periodStart ?? '', periodEnd ?? '', totalWork ?? 0, totalActivation ?? 0, totalCancel ?? 0, note ?? '', sortOrder ?? 0, id]
  )
  const rows = await dbQuery('SELECT * FROM member_performance WHERE id=$1', [id])
  return NextResponse.json(rows[0])
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  const { id } = await params
  await dbRun('DELETE FROM member_performance WHERE id=$1', [id])
  return NextResponse.json({ ok: true })
}
