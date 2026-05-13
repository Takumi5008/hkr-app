import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQueryOne, dbRun } from '@/lib/db'
import { del } from '@vercel/blob'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const row = await dbQueryOne<{ url: string }>('SELECT url FROM knowledge_materials WHERE id = $1', [id])
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await del(row.url)
  } catch {
    // blob削除失敗でもDBからは消す
  }

  await dbRun('DELETE FROM knowledge_materials WHERE id = $1', [id])
  return NextResponse.json({ ok: true })
}
