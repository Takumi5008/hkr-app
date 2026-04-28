export interface QuestDef {
  id: string
  title: string
  desc: string
  icon: string
  target: number
  reward: number
  bgColor: string
  barColor: string
}

export const WEEKLY_QUESTS: QuestDef[] = [
  { id: 'wq_activation_3', title: '今週3件開通',    desc: '今週の開通実績（行動表）を3件以上記録する', icon: '⚡', target: 3,  reward: 50, bgColor: 'bg-amber-50 border-amber-200',   barColor: 'bg-amber-400' },
  { id: 'wq_activity_3',   title: '行動表3日入力',  desc: '今週の行動表を3日分入力する',              icon: '📋', target: 3,  reward: 20, bgColor: 'bg-sky-50 border-sky-200',       barColor: 'bg-sky-400' },
  { id: 'wq_login_5',      title: '5日ログイン',    desc: '今週5日アプリを開く',                      icon: '🔥', target: 5,  reward: 30, bgColor: 'bg-orange-50 border-orange-200', barColor: 'bg-orange-400' },
  { id: 'wq_mtg',          title: 'MTG出欠を入力',  desc: '今週金曜のMTG出欠を入力する',              icon: '🗓️', target: 1,  reward: 10, bgColor: 'bg-rose-50 border-rose-200',     barColor: 'bg-rose-400' },
  { id: 'wq_shift',        title: 'シフトを提出',   desc: '今月のシフトを提出する',                   icon: '📅', target: 1,  reward: 10, bgColor: 'bg-emerald-50 border-emerald-200', barColor: 'bg-emerald-400' },
]

export function getWeekStartJST(): string {
  const jst = new Date(Date.now() + 9 * 3600_000)
  const day = jst.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(jst.getTime() + diff * 86_400_000)
  return monday.toISOString().slice(0, 10)
}

export function getWeekEndJST(): string {
  const start = getWeekStartJST()
  const d = new Date(start)
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().slice(0, 10)
}

export function getTodayJST(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
}

export function getThisFridayJST(): string {
  const jst = new Date(Date.now() + 9 * 3600_000)
  const day = jst.getUTCDay()
  const diff = day <= 5 ? 5 - day : 12 - day
  const friday = new Date(jst.getTime() + diff * 86_400_000)
  return friday.toISOString().slice(0, 10)
}
