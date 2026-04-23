import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const tasks = await dbQuery(
    'SELECT * FROM tasks WHERE user_id = $1 ORDER BY done ASC, due_date ASC NULLS LAST, created_at ASC',
    [session.userId]
  )
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { title, dueDate } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'タイトルを入力してください' }, { status: 400 })
  const result = await dbRun(
    `INSERT INTO tasks (user_id, title, due_date) VALUES ($1, $2, $3) RETURNING id`,
    [session.userId, title.trim(), dueDate || null]
  )
  const task = await dbQuery('SELECT * FROM tasks WHERE id = $1', [result.id])
  return NextResponse.json(task[0])
}
