import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

const SEED_DATA = [
  { name: '小守谷', activationTarget: 20, cancelTarget: 16, workDaysTarget: 18, periodStart: '2025-04-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 239, totalCancel: 192, note: '', sortOrder: 0 },
  { name: '藍野', activationTarget: 15, cancelTarget: 14, workDaysTarget: 15, periodStart: '2025-04-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 179, totalCancel: 168, note: '', sortOrder: 1 },
  { name: '黒須', activationTarget: 16, cancelTarget: 14, workDaysTarget: 13, periodStart: '2025-04-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 187, totalCancel: 162, note: '', sortOrder: 2 },
  { name: '松岡', activationTarget: 15, cancelTarget: 13, workDaysTarget: 13, periodStart: '2025-04-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 182, totalCancel: 153, note: '', sortOrder: 3 },
  { name: '寺内', activationTarget: 14, cancelTarget: 12, workDaysTarget: 13, periodStart: '2025-04-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 167, totalCancel: 140, note: '', sortOrder: 4 },
  { name: '宮塚', activationTarget: 15, cancelTarget: 11, workDaysTarget: 13, periodStart: '2025-04-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 175, totalCancel: 130, note: '', sortOrder: 5 },
  { name: '佐藤', activationTarget: 12, cancelTarget: 9, workDaysTarget: 8, periodStart: '2025-04-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 139, totalCancel: 113, note: '', sortOrder: 6 },
  { name: '牧', activationTarget: 9, cancelTarget: 8, workDaysTarget: 8, periodStart: '2025-04-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 109, totalCancel: 101, note: '', sortOrder: 7 },
  { name: '鎌田', activationTarget: 9, cancelTarget: 7, workDaysTarget: 9, periodStart: '2025-08-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 72, totalCancel: 55, note: '', sortOrder: 8 },
  { name: '猪狩', activationTarget: 8, cancelTarget: 6, workDaysTarget: 11, periodStart: '2025-04-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 100, totalCancel: 77, note: '', sortOrder: 9 },
  { name: '飯村', activationTarget: 8, cancelTarget: 6, workDaysTarget: 9, periodStart: '2025-06-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 82, totalCancel: 59, note: '', sortOrder: 10 },
  { name: '久保田', activationTarget: 8, cancelTarget: 6, workDaysTarget: 13, periodStart: '2026-03-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 8, totalCancel: 6, note: '', sortOrder: 11 },
  { name: '高崎', activationTarget: 6, cancelTarget: 5, workDaysTarget: 10, periodStart: '2025-04-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 75, totalCancel: 64, note: '', sortOrder: 12 },
  { name: '齋藤あ', activationTarget: 7, cancelTarget: 5, workDaysTarget: 7, periodStart: '2026-01-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 20, totalCancel: 15, note: '', sortOrder: 13 },
  { name: '羽根田', activationTarget: 8, cancelTarget: 5, workDaysTarget: 11, periodStart: '2025-10-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 45, totalCancel: 28, note: '', sortOrder: 14 },
  { name: '髙木', activationTarget: 9, cancelTarget: 5, workDaysTarget: 11, periodStart: '2025-09-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 60, totalCancel: 38, note: '', sortOrder: 15 },
  { name: '高橋', activationTarget: 7, cancelTarget: 4, workDaysTarget: 10, periodStart: '2025-05-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 80, totalCancel: 53, note: '', sortOrder: 16 },
  { name: '斉藤ひ', activationTarget: 5, cancelTarget: 3, workDaysTarget: 9, periodStart: '2025-10-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 32, totalCancel: 16, note: '', sortOrder: 17 },
  { name: '和田', activationTarget: 6, cancelTarget: 3, workDaysTarget: 12, periodStart: '2026-01-01', periodEnd: '2026-03-31', totalWork: 0, totalActivation: 18, totalCancel: 10, note: '', sortOrder: 18 },
  { name: '木村', activationTarget: 0, cancelTarget: 0, workDaysTarget: 0, periodStart: '2026-04-01', periodEnd: '2026-04-30', totalWork: 0, totalActivation: 0, totalCancel: 0, note: '', sortOrder: 19 },
  { name: '田代', activationTarget: 0, cancelTarget: 0, workDaysTarget: 0, periodStart: '2026-04-01', periodEnd: '2026-04-30', totalWork: 0, totalActivation: 0, totalCancel: 0, note: '', sortOrder: 20 },
]

export async function POST() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const existing = await dbQuery('SELECT COUNT(*) as cnt FROM member_performance', [])
  const cnt = parseInt((existing[0] as any).cnt)
  if (cnt > 0) return NextResponse.json({ error: 'データが既に存在します', count: cnt }, { status: 409 })

  for (const d of SEED_DATA) {
    await dbRun(
      `INSERT INTO member_performance
       (name, activation_target, cancel_target, work_days_target, period_start, period_end, total_work, total_activation, total_cancel, note, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [d.name, d.activationTarget, d.cancelTarget, d.workDaysTarget, d.periodStart, d.periodEnd, d.totalWork, d.totalActivation, d.totalCancel, d.note, d.sortOrder]
    )
  }

  return NextResponse.json({ ok: true, inserted: SEED_DATA.length })
}
