import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

function getFridaysForMonth(year: number, month: number): string[] {
  const fridays: string[] = []
  const d = new Date(year, month - 1, 1)
  const daysUntilFriday = (5 - d.getDay() + 7) % 7
  d.setDate(1 + daysUntilFriday)
  while (d.getMonth() === month - 1) {
    fridays.push(`${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    d.setDate(d.getDate() + 7)
  }
  return fridays
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  return NextResponse.json(getFridaysForMonth(year, month))
}
