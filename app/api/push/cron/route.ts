import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { dbQuery } from '@/lib/db'
import { getSession } from '@/lib/session'

// JST今日の日付を複数フォーマットで返す
function todayFormats(): string[] {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000) // UTC+9
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + 1
  const d = now.getUTCDate()
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return [
    `${y}-${mm}-${dd}`,
    `${y}/${mm}/${dd}`,
    `${m}/${d}`,
    `${mm}/${dd}`,
    `${m}月${d}日`,
  ]
}

const CHECK_FIELDS = [
  { field: 'fm',                      doneField: 'fm_done',                      label: 'FM' },
  { field: 'week_after',              doneField: 'week_after_done',              label: '獲得1週間後' },
  { field: 'day_before_construction', doneField: 'day_before_construction_done', label: '工事日前日' },
  { field: 'construction_date',       doneField: 'construction_date_done',       label: '工事日' },
  { field: 'day_before_delivery',     doneField: 'day_before_delivery_done',     label: '受け取り日前日' },
  { field: 'delivery_date',           doneField: 'delivery_date_done',           label: '受取日' },
  { field: 'week_after_delivery',     doneField: 'week_after_delivery_done',     label: '受け取り1週間後' },
]

export async function GET(req: NextRequest) {
  try {
  // Vercel Cron secret check or manager session
  const authHeader = req.headers.get('authorization')
  let isManager = false
  try {
    const session = await getSession()
    isManager = session.role === 'manager'
  } catch {}
  if (!isManager && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  }
  if (!isManager && !process.env.CRON_SECRET) {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 })
  }

  const rawPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
  const rawPrivate = process.env.VAPID_PRIVATE_KEY ?? ''
  if (!rawPublic || !rawPrivate) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
  }
  // =・空白・改行・引用符を除去してURLセーフbase64に正規化
  const vapidPublic = rawPublic.trim().replace(/[="'\s]/g, '')
  const vapidPrivate = rawPrivate.trim().replace(/[="'\s]/g, '')

  return NextResponse.json({ debug: { pubLen: vapidPublic.length, pubStart: vapidPublic.slice(0, 10), pubEnd: vapidPublic.slice(-5) } })

  webpush.setVapidDetails(
    'mailto:admin@example.com',
    vapidPublic,
    vapidPrivate
  )

  const formats = todayFormats()
  const notifyMap = new Map<number, string[]>() // user_id -> messages

  for (const { field, doneField, label } of CHECK_FIELDS) {
    // Build OR conditions for all date formats
    const placeholders = formats.map((_, i) => `$${i + 1}`).join(', ')
    const rows = await dbQuery<{ user_id: number; name: string; type: string }>(
      `SELECT user_id, name, type FROM activation_records
       WHERE ${field} IN (${placeholders}) AND ${doneField} = 0`,
      formats
    )
    for (const row of rows) {
      const msgs = notifyMap.get(row.user_id) ?? []
      msgs.push(`${row.name} (${row.type === 'sonet' ? 'So-net' : row.type === 'wimax_post' ? 'WiMAX後送り' : 'WiMAX直せち'}) の${label}`)
      notifyMap.set(row.user_id, msgs)
    }
  }

  // Send push notifications
  let sent = 0
  for (const [userId, msgs] of notifyMap.entries()) {
    const subs = await dbQuery<{ subscription: string }>(
      `SELECT subscription FROM push_subscriptions WHERE user_id = $1`, [userId]
    )
    if (subs.length === 0) continue

    const payload = JSON.stringify({
      title: '【未確認】開通フォロー',
      body: msgs.join('\n'),
      tag: `cron-${Date.now()}`,
    })

    try {
      await Promise.race([
        webpush.sendNotification(JSON.parse(subs[0].subscription), payload),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ])
      sent++
    } catch (e: any) {
      // 期限切れまたはタイムアウトのサブスクリプションは削除
      await dbQuery(`DELETE FROM push_subscriptions WHERE user_id = $1`, [userId])
    }
  }

  return NextResponse.json({ ok: true, sent, checked: notifyMap.size })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? '不明なエラー' }, { status: 500 })
  }
}
