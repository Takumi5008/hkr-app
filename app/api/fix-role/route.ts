import { NextResponse } from 'next/server'
import { dbRun, dbQuery } from '@/lib/db'

export async function GET() {
  try {
    await dbRun(
      `UPDATE users SET role = 'manager' WHERE email = 'komotaku0508@gmail.com'`
    )
    const [user] = await dbQuery(
      `SELECT id, name, role FROM users WHERE email = 'komotaku0508@gmail.com'`
    )
    return NextResponse.json({ ok: true, user })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
