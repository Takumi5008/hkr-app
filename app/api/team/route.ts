import { NextRequest, NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'member') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const month = Number(searchParams.get('month') || new Date().getMonth() + 1)

  const users = await dbQuery('SELECT id, name, role FROM users ORDER BY name')
  const records = await dbQuery(
    'SELECT * FROM records WHERE year = $1 AND month = $2',
    [year, month]
  )

  const data = users.map((u: any) => {
    const userRecords = records.filter((r: any) => r.user_id === u.id)
    return { user: u, records: userRecords }
  })

  return NextResponse.json(data)
}
