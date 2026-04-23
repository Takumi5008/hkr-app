import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { dbQuery, dbRun } from '@/lib/db'

const DATA = [
  // 2022
  { year: 2022, month: 5,  a: 297, c: 171, m: 34 },
  { year: 2022, month: 6,  a: 280, c: 132, m: 34 },
  { year: 2022, month: 7,  a: 265, c: 133, m: 28 },
  { year: 2022, month: 8,  a: 229, c: 103, m: 27 },
  { year: 2022, month: 9,  a: 286, c: 136, m: 22 },
  { year: 2022, month: 10, a: 182, c: 99,  m: 20 },
  { year: 2022, month: 11, a: 107, c: 41,  m: 18 },
  { year: 2022, month: 12, a: 102, c: 51,  m: 16 },
  // 2023
  { year: 2023, month: 1,  a: 115, c: 57,  m: 15 },
  { year: 2023, month: 2,  a: 155, c: 70,  m: 13 },
  { year: 2023, month: 3,  a: 192, c: 124, m: 14 },
  { year: 2023, month: 4,  a: 175, c: 121, m: 13 },
  { year: 2023, month: 5,  a: 187, c: 122, m: 13 },
  { year: 2023, month: 6,  a: 131, c: 77,  m: 13 },
  { year: 2023, month: 7,  a: 163, c: 113, m: 13 },
  { year: 2023, month: 8,  a: 194, c: 122, m: 15 },
  { year: 2023, month: 9,  a: 227, c: 154, m: 18 },
  { year: 2023, month: 10, a: 239, c: 188, m: 20 },
  { year: 2023, month: 11, a: 255, c: 179, m: 22 },
  { year: 2023, month: 12, a: 257, c: 210, m: 23 },
  // 2024
  { year: 2024, month: 1,  a: 277, c: 205, m: 25 },
  { year: 2024, month: 2,  a: 369, c: 248, m: 24 },
  { year: 2024, month: 3,  a: 261, c: 172, m: 22 },
  { year: 2024, month: 4,  a: 210, c: 155, m: 18 },
  { year: 2024, month: 5,  a: 237, c: 180, m: 22 },
  { year: 2024, month: 6,  a: 249, c: 169, m: 21 },
  { year: 2024, month: 7,  a: 210, c: 157, m: 20 },
  { year: 2024, month: 8,  a: 282, c: 217, m: 19 },
  { year: 2024, month: 9,  a: 217, c: 156, m: 20, note: 'season9 (9/15〜10/14)' },
  { year: 2024, month: 10, a: 189, c: 156, m: 20, note: 'season10 (10/15〜11/14)' },
  { year: 2024, month: 11, a: 185, c: 145, m: 19, note: 'season11 (11/15〜12/14)' },
  // 2025
  { year: 2025, month: 1,  a: 165, c: 133, m: 21 },
  { year: 2025, month: 2,  a: 230, c: 206, m: 21 },
  { year: 2025, month: 3,  a: 263, c: 221, m: 25 },
  { year: 2025, month: 4,  a: 198, c: 180, m: 20 },
  { year: 2025, month: 5,  a: 240, c: 200, m: 22 },
  { year: 2025, month: 6,  a: 249, c: 195, m: 24 },
  { year: 2025, month: 7,  a: 224, c: 185, m: 23 },
  { year: 2025, month: 8,  a: 274, c: 228, m: 23 },
  { year: 2025, month: 9,  a: 240, c: 187, m: 24 },
  { year: 2025, month: 10, a: 223, c: 193, m: 27 },
  { year: 2025, month: 11, a: 317, c: 242, m: 26 },
  { year: 2025, month: 12, a: 202, c: 165, m: 26 },
  // 2026
  { year: 2026, month: 1,  a: 223, c: 171, m: 28 },
  { year: 2026, month: 2,  a: 326, c: 262, m: 29 },
  { year: 2026, month: 3,  a: 344, c: 273, m: 27 },
]

export async function POST() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager') return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  for (const d of DATA) {
    await dbRun(
      `INSERT INTO monthly_team_stats (year, month, total_activation, total_cancel, member_count, note)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (year, month) DO UPDATE SET
         total_activation = EXCLUDED.total_activation,
         total_cancel     = EXCLUDED.total_cancel,
         member_count     = EXCLUDED.member_count,
         note             = EXCLUDED.note`,
      [d.year, d.month, d.a, d.c, d.m, (d as any).note ?? '']
    )
  }

  return NextResponse.json({ ok: true, inserted: DATA.length })
}
