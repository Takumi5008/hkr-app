import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDb } from '@/lib/db'

export async function GET() {
  const db = getDb()
  const products = db.prepare('SELECT * FROM products ORDER BY sort_order, id').all()
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
  const db = getDb()
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM products').get() as any)?.m ?? -1
  try {
    const result = db.prepare('INSERT INTO products (name, sort_order) VALUES (?, ?)').run(name.trim(), maxOrder + 1)
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid)
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
  const db = getDb()
  try {
    db.prepare('UPDATE products SET name = ? WHERE name = ?').run(newName.trim(), oldName)
    db.prepare('UPDATE records SET product = ? WHERE product = ?').run(newName.trim(), oldName)
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
  const db = getDb()
  db.prepare('DELETE FROM products WHERE name = ?').run(name)
  return NextResponse.json({ ok: true })
}
