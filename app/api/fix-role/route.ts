import { NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || ''
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('.render.com') ? { rejectUnauthorized: false } : false,
  })
  try {
    const result = await pool.query(
      `UPDATE users SET role = 'manager' WHERE email = 'komotaku0508@gmail.com' RETURNING id, name, role`
    )
    return NextResponse.json({ ok: true, updated: result.rows })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  } finally {
    await pool.end()
  }
}
