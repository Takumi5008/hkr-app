import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { dbQuery, dbRun } from '@/lib/db'
import { getSession } from '@/lib/session'

// deadline_at は JST の datetime-local 文字列 "YYYY-MM-DDTHH:MM"
function deadlineToDate(deadlineAt: string): Date {
  return new Date(deadlineAt + ':00+09:00')
}

function jstNow(): Date {
  return new Date()
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    let isManager = false
    try { const session = await getSession(); isManager = session.role === 'manager' } catch {}
    if (!isManager && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }
    if (!isManager && !process.env.CRON_SECRET) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.trim().replace(/[="'\s]/g, '')
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY.trim().replace(/[="'\s]/g, '')
    webpush.setVapidDetails('mailto:admin@example.com', vapidPublic, vapidPrivate)

    const now = jstNow()
    const in60min = new Date(now.getTime() + 60 * 60 * 1000)
    let sent = 0

    // 全ユーザーのプッシュ購読を取得
    const allSubs = await dbQuery<{ user_id: number; subscription: string; role: string; name: string }>(
      `SELECT ps.user_id, ps.subscription, u.role, u.name
       FROM push_subscriptions ps JOIN users u ON u.id = ps.user_id`
    )

    async function sendPush(userId: number, title: string, body: string) {
      const sub = allSubs.find((s) => s.user_id === userId)
      if (!sub) return
      try {
        await Promise.race([
          webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify({ title, body, tag: `reminder-${Date.now()}` })),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
        ])
        sent++
      } catch {
        await dbRun(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId])
      }
    }

    // ===== シフト締切チェック =====
    const shiftDeadlines = await dbQuery<{ id: number; year: number; month: number; deadline_at: string }>(
      `SELECT id, year, month, deadline_at FROM shift_deadlines WHERE reminder_sent = 0`
    )
    for (const dl of shiftDeadlines) {
      const deadline = deadlineToDate(dl.deadline_at)
      if (deadline > now && deadline <= in60min) {
        // 未提出メンバーを取得
        const unsubmitted = await dbQuery<{ id: number }>(
          `SELECT u.id FROM users u
           WHERE u.role = 'member'
           AND u.id NOT IN (
             SELECT user_id FROM shifts WHERE year = $1 AND month = $2 AND submitted = 1
           )`,
          [dl.year, dl.month]
        )
        const managers = allSubs.filter((s) => s.role === 'manager')
        const minutesLeft = Math.round((deadline.getTime() - now.getTime()) / 60000)
        const body = `${dl.year}年${dl.month}月のシフト提出締切まで約${minutesLeft}分です`

        for (const u of unsubmitted) {
          await sendPush(u.id, '【締切間近】シフト提出', body)
        }
        for (const m of managers) {
          await sendPush(m.user_id, '【締切間近】シフト提出', `未提出${unsubmitted.length}人・${body}`)
        }
        await dbRun(`UPDATE shift_deadlines SET reminder_sent = 1 WHERE id = $1`, [dl.id])
      }
    }

    // ===== MTG締切チェック =====
    const mtgDeadlines = await dbQuery<{ id: number; year: number; month: number; deadline_at: string }>(
      `SELECT id, year, month, deadline_at FROM mtg_month_deadlines WHERE reminder_sent = 0`
    )
    for (const dl of mtgDeadlines) {
      const deadline = deadlineToDate(dl.deadline_at)
      if (deadline > now && deadline <= in60min) {
        // その月の金曜日を取得
        const fridays: string[] = []
        const daysInMonth = new Date(dl.year, dl.month, 0).getDate()
        for (let d = 1; d <= daysInMonth; d++) {
          if (new Date(dl.year, dl.month - 1, d).getDay() === 5) {
            const mm = String(dl.month).padStart(2, '0')
            const dd = String(d).padStart(2, '0')
            fridays.push(`${dl.year}-${mm}-${dd}`)
          }
        }
        // 1つでも未提出の金曜がある未提出メンバー
        const unsubmitted = await dbQuery<{ id: number }>(
          `SELECT DISTINCT u.id FROM users u
           WHERE u.role = 'member'
           AND EXISTS (
             SELECT 1 FROM generate_series(1, $1) g
             WHERE $2::text[] @> ARRAY[(TO_CHAR(DATE '${dl.year}-${String(dl.month).padStart(2,'0')}-01' + (g-1) * INTERVAL '1 day', 'YYYY-MM-DD'))]
           )
           AND u.id NOT IN (
             SELECT DISTINCT user_id FROM mtg_attendance WHERE date = ANY($2::text[])
           )`,
          [daysInMonth, fridays]
        ).catch(() => [] as { id: number }[])

        const managers = allSubs.filter((s) => s.role === 'manager')
        const minutesLeft = Math.round((deadline.getTime() - now.getTime()) / 60000)
        const body = `${dl.year}年${dl.month}月のMTG出欠提出締切まで約${minutesLeft}分です`

        for (const u of unsubmitted) {
          await sendPush(u.id, '【締切間近】MTG出欠提出', body)
        }
        for (const m of managers) {
          await sendPush(m.user_id, '【締切間近】MTG出欠提出', `未提出${unsubmitted.length}人・${body}`)
        }
        await dbRun(`UPDATE mtg_month_deadlines SET reminder_sent = 1 WHERE id = $1`, [dl.id])
      }
    }

    return NextResponse.json({ ok: true, sent })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? '不明なエラー' }, { status: 500 })
  }
}
