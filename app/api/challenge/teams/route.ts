import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  const rows = await dbQuery(
    'SELECT * FROM challenge_teams WHERE year = $1 AND month = $2 ORDER BY display_order, id',
    [year, month]
  )
  return NextResponse.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    target: r.target,
    memberIds: JSON.parse(r.member_ids ?? '[]'),
    displayOrder: r.display_order,
  })))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'admin') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { id, year, month, name, target, memberIds, displayOrder } = await req.json()

  if (id) {
    await dbRun(
      'UPDATE challenge_teams SET name=$1, target=$2, member_ids=$3, display_order=$4 WHERE id=$5',
      [name, target ?? 0, JSON.stringify(memberIds ?? []), displayOrder ?? 0, id]
    )
  } else {
    await dbRun(
      'INSERT INTO challenge_teams (year, month, name, target, member_ids, display_order) VALUES ($1,$2,$3,$4,$5,$6)',
      [year, month, name, target ?? 0, JSON.stringify(memberIds ?? []), displayOrder ?? 0]
    )
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'admin') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const { id } = await req.json()
  await dbRun('DELETE FROM challenge_teams WHERE id = $1', [id])
  return NextResponse.json({ ok: true })
}
