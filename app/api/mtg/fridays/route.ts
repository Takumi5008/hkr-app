import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

function getFridays(weeks = 8): string[] {
  const fridays: string[] = []
  const d = new Date()
  const diff = (5 - d.getDay() + 7) % 7
  d.setDate(d.getDate() + diff)
  for (let i = 0; i < weeks; i++) {
    fridays.push(new Date(d).toISOString().slice(0, 10))
    d.setDate(d.getDate() + 7)
  }
  return fridays
}

export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  return NextResponse.json(getFridays(8))
}
