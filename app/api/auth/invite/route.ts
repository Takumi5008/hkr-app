import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { dbQuery, dbRun } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await dbRun(
    'INSERT INTO invite_tokens (token, created_by, expires_at) VALUES ($1, $2, $3)',
    [token, session.userId, expiresAt]
  )

  return NextResponse.json({ token })
}

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const tokens = await dbQuery(`
    SELECT it.*, u.name as created_by_name
    FROM invite_tokens it
    JOIN users u ON it.created_by = u.id
    ORDER BY it.created_at DESC
    LIMIT 20
  `)

  return NextResponse.json(tokens)
}

export async function DELETE() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await dbRun(`DELETE FROM invite_tokens WHERE used = 1 OR expires_at < TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`)

  return NextResponse.json({ ok: true })
}
