import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQueryOne, dbQuery } from '@/lib/db'
import { getDeadlineAt, deadlineToDate, nextMonthJst } from '@/lib/deadlines'


export async function GET() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const now = new Date()
  const in60min = new Date(now.getTime() + 60 * 60 * 1000)
  // 締切は対象月の前月にあるため、今月中に締切を迎える「翌月分」をチェックする
  const { year, month } = nextMonthJst(now)

  const result: { type: 'shift' | 'mtg'; minutesLeft: number; label: string }[] = []

  // シフト締切チェック
  {
    const deadline = deadlineToDate(await getDeadlineAt('shift', year, month))
    if (deadline > now && deadline <= in60min) {
      // 自分が未提出かチェック
      const submitted = await dbQueryOne(
        `SELECT 1 FROM shifts WHERE user_id = $1 AND year = $2 AND month = $3 AND submitted = 1`,
        [session.userId, year, month]
      )
      if (!submitted) {
        const minutesLeft = Math.round((deadline.getTime() - now.getTime()) / 60000)
        result.push({ type: 'shift', minutesLeft, label: `${year}年${month}月のシフト提出締切まで約${minutesLeft}分` })
      }
    }
  }

  // MTG締切チェック
  {
    const deadline = deadlineToDate(await getDeadlineAt('mtg', year, month))
    if (deadline > now && deadline <= in60min) {
      // この月の金曜日に1つでも未提出があるかチェック
      const daysInMonth = new Date(year, month, 0).getDate()
      const fridays: string[] = []
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month - 1, d).getDay() === 5) {
          fridays.push(`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
        }
      }
      const submitted = await dbQuery(
        `SELECT date FROM mtg_attendance WHERE user_id = $1 AND date = ANY($2::text[])`,
        [session.userId, fridays]
      )
      if (submitted.length < fridays.length) {
        const minutesLeft = Math.round((deadline.getTime() - now.getTime()) / 60000)
        result.push({ type: 'mtg', minutesLeft, label: `${year}年${month}月のMTG出欠提出締切まで約${minutesLeft}分` })
      }
    }
  }

  return NextResponse.json(result)
}
