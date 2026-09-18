'use client'

import { useState } from 'react'
import { Settings, ChevronUp, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  year: number
  month: number
  currentGoal: number
}

export default function ChallengeAdminPanel({ year, month, currentGoal }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [goal, setGoal] = useState(currentGoal)
  const [goalSaving, setGoalSaving] = useState(false)
  const [goalSaved, setGoalSaved] = useState(false)

  async function saveGoal() {
    setGoalSaving(true)
    await fetch('/api/challenge/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, goal }),
    })
    setGoalSaving(false)
    setGoalSaved(true)
    setTimeout(() => { setGoalSaved(false); router.refresh() }, 1500)
  }

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <Settings size={15} className="text-gray-400" />
          管理者設定（目標）
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-5">
          {/* 開通目標 */}
          <div className="pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">チャレンジ目標（開通数）</p>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1}
                value={goal}
                onChange={e => setGoal(parseInt(e.target.value) || 200)}
                className="w-24 text-center text-lg font-bold border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <span className="text-sm text-gray-500">件</span>
              <button
                onClick={saveGoal}
                disabled={goalSaving}
                className="px-4 py-2 bg-violet-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-violet-600 transition"
              >
                {goalSaved ? '✓ 保存' : goalSaving ? '保存中...' : '保存'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              チーム編集は「個人進捗」ページの「全体」タブに移動しました。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
