import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery } from '@/lib/db'
import { calcHKR } from '@/lib/hkr'
import { type PlayerCardData, type CardTier, type FormResult } from '@/components/PlayerCard'

function getWeekBounds(weeksAgo: number): { from: string; to: string } {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday - weeksAgo * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(monday), to: fmt(sunday) }
}

function statScore(value: number, max: number): number {
  return Math.min(Math.round((value / max) * 99), 99)
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'viewer') {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') ?? new Date().getFullYear())
  const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1)

  const memberRows = await dbQuery(
    `SELECT u.id, u.name,
            COALESCE(SUM(r.activation_count), 0)::int AS activation,
            COALESCE(SUM(r.cancel_count), 0)::int AS cancel
     FROM users u
     LEFT JOIN records r ON r.user_id = u.id AND r.year = $1 AND r.month = $2
     GROUP BY u.id, u.name
     HAVING COALESCE(SUM(r.activation_count), 0) > 0
     ORDER BY activation DESC`,
    [year, month]
  )
  if (memberRows.length === 0) return NextResponse.json([])

  const monthStr = `${year}-${String(month).padStart(2, '0')}-%`
  const activityRows = await dbQuery(
    `SELECT user_id,
            COALESCE(SUM(pingpong_count + intercom_count), 0)::int AS action_total,
            COUNT(DISTINCT date)::int AS active_days
     FROM daily_activity WHERE date LIKE $1 GROUP BY user_id`,
    [monthStr]
  )
  const activityMap = new Map(activityRows.map((r: any) => [r.user_id, r]))

  const lastWeek = getWeekBounds(1)
  const totwRows = await dbQuery(
    `SELECT user_id, COALESCE(SUM(wimax + sonet), 0)::int AS weekly
     FROM daily_activity WHERE date >= $1 AND date <= $2
     GROUP BY user_id ORDER BY weekly DESC LIMIT 1`,
    [lastWeek.from, lastWeek.to]
  )
  const totwUserId: number | null = (totwRows[0]?.weekly ?? 0) > 0 ? totwRows[0].user_id : null

  const formWeeks = [0, 1, 2, 3].map((w) => getWeekBounds(w))
  const formActivityRows = await dbQuery(
    `SELECT user_id, date, (wimax + sonet)::int AS activation
     FROM daily_activity WHERE date >= $1 ORDER BY date`,
    [formWeeks[3].from]
  )

  const cards: PlayerCardData[] = (memberRows as any[]).map((m, idx) => {
    const hkr = calcHKR(m.activation, m.cancel) ?? 50
    const act = activityMap.get(m.id)
    const activationScore = statScore(m.activation, 20)
    const hkrScore = Math.min(hkr, 99)
    const actionScore = statScore(act?.action_total ?? 0, 150)
    const consistScore = statScore(act?.active_days ?? 0, 20)

    const userDays = formActivityRows.filter((r: any) => r.user_id === m.id)
    const form: FormResult[] = formWeeks.map(({ from, to }) => {
      const sum = userDays.filter((r: any) => r.date >= from && r.date <= to).reduce((s: number, r: any) => s + r.activation, 0)
      return sum >= 4 ? 'W' : sum >= 1 ? 'D' : 'L'
    })

    const formScore = Math.round(
      (form.filter((f) => f === 'W').length * 2 + form.filter((f) => f === 'D').length) / (form.length * 2) * 99
    )
    const ovr = Math.round(
      activationScore * 0.40 + hkrScore * 0.30 + actionScore * 0.15 + consistScore * 0.10 + formScore * 0.05
    )

    const isTotw = m.id === totwUserId
    const tier: CardTier = isTotw ? 'totw' : ovr >= 85 ? 'elite' : ovr >= 72 ? 'gold' : ovr >= 55 ? 'silver' : 'bronze'

    return {
      userId: m.id,
      name: m.name,
      rank: idx + 1,
      ovr,
      tier,
      isTotw,
      activation: m.activation,
      stats: [
        { label: '開通', value: activationScore },
        { label: 'HKR', value: hkrScore },
        { label: '行動', value: actionScore },
        { label: '継続', value: consistScore },
      ],
      form,
    }
  })

  cards.sort((a, b) => (b.isTotw ? 1 : 0) - (a.isTotw ? 1 : 0) || a.rank - b.rank)
  return NextResponse.json(cards)
}
