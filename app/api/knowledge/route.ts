import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')

  const rows = category
    ? await dbQuery(
        `SELECT km.*, u.name AS uploader_name FROM knowledge_materials km LEFT JOIN users u ON u.id = km.uploaded_by WHERE km.category = $1 ORDER BY km.created_at DESC`,
        [category]
      )
    : await dbQuery(
        `SELECT km.*, u.name AS uploader_name FROM knowledge_materials km LEFT JOIN users u ON u.id = km.uploaded_by ORDER BY km.created_at DESC`
      )

  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, category, fileType, url, fileName, fileSize } = await req.json()
  if (!title || !category || !fileType || !url) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  const result = await dbRun(
    `INSERT INTO knowledge_materials (title, description, category, file_type, url, file_name, file_size, uploaded_by, uploader_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [title, description ?? '', category, fileType, url, fileName ?? '', fileSize ?? 0, session.userId, session.name]
  )

  return NextResponse.json({ id: result.id })
}
