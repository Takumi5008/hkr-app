import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbQueryOne, dbRun } from '@/lib/db'

export async function GET() {
  const products = await dbQuery('SELECT * FROM products ORDER BY sort_order, id')
  return NextResponse.json(products)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.userId || session.role !== 'manager') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { name } = await req.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: '商材名を入力してください' }, { status: 400 })
  }
  const maxRow = await dbQueryOne('SELECT MAX(sort_order) as m FROM products')
  const maxOrder = maxRow?.m ?? -1
  try {
    const result = await dbRun(
      'INSERT INTO products (name, sort_order) VALUES ($1, $2) RETURNING id',
      [name.trim(), maxOrder + 1]
    )
    const product = await dbQueryOne('SELECT * FROM products WHERE id = $1', [result.id])
    return NextResponse.json(product)
  } catch {
    return NextResponse.json({ error: 'すでに存在する商材名です' }, { status: 409 })
  }
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session.userId || session.role !== 'manager') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { oldName, newName } = await req.json()
  if (!newName || typeof newName !== 'string' || !newName.trim()) {
    return NextResponse.json({ error: '新しい名前を入力してください' }, { status: 400 })
  }
  try {
    await dbRun('UPDATE products SET name = $1 WHERE name = $2', [newName.trim(), oldName])
    await dbRun('UPDATE records SET product = $1 WHERE product = $2', [newName.trim(), oldName])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'すでに存在する名前です' }, { status: 409 })
  }
}

export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session.userId || session.role !== 'manager') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { name } = await req.json()
  await dbRun('DELETE FROM products WHERE name = $1', [name])
  return NextResponse.json({ ok: true })
}
