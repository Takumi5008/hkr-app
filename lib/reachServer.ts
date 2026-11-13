import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { parseMonthly, type ReachMember } from '@/lib/reach'

export interface ReachRow {
  id: number; name: string; start_date: string; end_date: string | null; planned_end: string | null
  monthly: string; challenger: boolean; paused: boolean; pause_start: string | null; resume_date: string | null; grade: string; note: string
}

export const toMember = (r: ReachRow): ReachMember => ({
  id: r.id,
  name: r.name,
  startDate: r.start_date,
  endDate: r.end_date,
  plannedEnd: r.planned_end,
  monthly: r.monthly ? r.monthly.split(',').map(Number) : [],
  challenger: r.challenger,
  paused: r.paused,
  pauseStart: r.pause_start,
  resumeDate: r.resume_date,
  grade: r.grade,
  note: r.note,
})

// マネージャー・アプリ管理者のみ（閲覧者は不可）
export async function requireReachManager() {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (session.role !== 'manager' && session.role !== 'admin') {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  return null
}

const isDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

// 入力チェック。OKなら DB に入れる値、NGならエラーメッセージ
export function validateReachInput(body: any): { values: unknown[] } | { error: string } {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 30) return { error: '名前は1〜30文字で入力してください' }
  if (!isDate(body.startDate)) return { error: '初稼働日が不正です' }
  const endDate = body.endDate ? body.endDate : null
  const plannedEnd = body.plannedEnd ? body.plannedEnd : null
  if (endDate !== null && !isDate(endDate)) return { error: '終了日が不正です' }
  if (plannedEnd !== null && !isDate(plannedEnd)) return { error: '終了予定日が不正です' }
  if (endDate && endDate < body.startDate) return { error: '終了日が初稼働日より前です' }
  const monthly = parseMonthly(String(body.monthly ?? ''))
  if (!monthly) return { error: '月別解除数は「2.5.8」のように数字を区切って入力してください' }
  const grade = typeof body.grade === 'string' ? body.grade.trim().slice(0, 5) : ''
  const pauseStart = body.pauseStart ? body.pauseStart : null
  const resumeDate = body.resumeDate ? body.resumeDate : null
  if (pauseStart !== null && !isDate(pauseStart)) return { error: '休止開始日が不正です' }
  if (resumeDate !== null && !isDate(resumeDate)) return { error: '再開日が不正です' }
  if (resumeDate && !pauseStart) return { error: '再開日を入れるときは休止開始日も入力してください' }
  if (pauseStart && resumeDate && resumeDate <= pauseStart) return { error: '再開日は休止開始日より後にしてください' }
  if (pauseStart && pauseStart < body.startDate) return { error: '休止開始日が初稼働日より前です' }
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : ''
  return { values: [name, body.startDate, endDate, plannedEnd, monthly.join(','), body.challenger === true, grade, note, body.paused === true, pauseStart, resumeDate] }
}
