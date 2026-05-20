'use client'

import { useState } from 'react'
import { Settings, Plus, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Team {
  id?: number
  name: string
  target: number
  memberIds: number[]
}

interface User {
  id: number
  name: string
}

interface Props {
  year: number
  month: number
  currentGoal: number
  currentTeams: Team[]
  allUsers: User[]
}

export default function ChallengeAdminPanel({ year, month, currentGoal, currentTeams, allUsers }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [goal, setGoal] = useState(currentGoal)
  const [goalSaving, setGoalSaving] = useState(false)
  const [goalSaved, setGoalSaved] = useState(false)
  const [teams, setTeams] = useState<Team[]>(currentTeams)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [saving, setSaving] = useState(false)

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

  async function saveTeam() {
    if (!editingTeam) return
    setSaving(true)
    await fetch('/api/challenge/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editingTeam, year, month }),
    })
    setSaving(false)
    setEditingTeam(null)
    router.refresh()
  }

  async function deleteTeam(id: number) {
    await fetch('/api/challenge/teams', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setTeams(prev => prev.filter(t => t.id !== id))
    router.refresh()
  }

  function toggleMember(userId: number) {
    if (!editingTeam) return
    const ids = editingTeam.memberIds.includes(userId)
      ? editingTeam.memberIds.filter(id => id !== userId)
      : [...editingTeam.memberIds, userId]
    setEditingTeam({ ...editingTeam, memberIds: ids })
  }

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-2">
          <Settings size={15} className="text-gray-400" />
          管理者設定（目標・チーム編集）
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
          </div>

          {/* チーム管理 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">チーム</p>
              <button
                onClick={() => setEditingTeam({ name: '', target: 0, memberIds: [] })}
                className="flex items-center gap-1 text-xs text-violet-600 font-semibold hover:text-violet-700"
              >
                <Plus size={13} />追加
              </button>
            </div>

            {teams.length === 0 && (
              <p className="text-xs text-gray-400 py-2">チームがありません。「追加」からチームを作成してください。</p>
            )}

            <div className="space-y-2">
              {teams.map(team => (
                <div key={team.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{team.name}</p>
                    <p className="text-xs text-gray-400">
                      目標 {team.target}件 ／ {team.memberIds.length}人
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingTeam({ ...team })}
                      className="text-xs text-indigo-500 font-medium hover:underline"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => team.id && deleteTeam(team.id)}
                      className="text-gray-300 hover:text-rose-500 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* チーム編集モーダル */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {editingTeam.id ? 'チームを編集' : 'チームを追加'}
              </h3>
              <button onClick={() => setEditingTeam(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">チーム名</label>
                <input
                  type="text"
                  value={editingTeam.name}
                  onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value })}
                  placeholder="例：Aチーム"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">目標開通数</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0}
                    value={editingTeam.target || ''}
                    onChange={e => setEditingTeam({ ...editingTeam, target: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-24 text-center border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <span className="text-sm text-gray-500">件</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-2">
                  メンバー（{editingTeam.memberIds.length}人選択中）
                </label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {allUsers.map(u => {
                    const selected = editingTeam.memberIds.includes(u.id)
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleMember(u.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                          selected
                            ? 'bg-violet-100 text-violet-700 font-semibold'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {selected ? '✓ ' : '　'}{u.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <button
              onClick={saveTeam}
              disabled={saving || !editingTeam.name}
              className="mt-5 w-full py-2.5 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition"
            >
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
