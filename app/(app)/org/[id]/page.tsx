'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Save, X } from 'lucide-react'

type OrgUser = {
  id: number
  name: string
  role: string
  position: string
  manager_id: number | null
  avatar: string | null
  profile_memo: string
}

function positionLabel(u: OrgUser) {
  if (u.position) return u.position
  if (u.role === 'admin') return '代表'
  if (u.role === 'manager') return 'マネージャー'
  return 'メンバー'
}

const roleColor = (role: string) =>
  role === 'admin'
    ? 'bg-violet-100 text-violet-700'
    : role === 'manager'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-gray-100 text-gray-600'

export default function OrgUserPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [users, setUsers] = useState<OrgUser[]>([])
  const [myRole, setMyRole] = useState('')
  const [myId, setMyId] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [editPosition, setEditPosition] = useState('')
  const [editManagerId, setEditManagerId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingMemo, setEditingMemo] = useState(false)
  const [memoText, setMemoText] = useState('')
  const [savingMemo, setSavingMemo] = useState(false)

  useEffect(() => {
    fetch('/api/org').then(r => r.json()).then(setUsers)
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setMyRole(d.role ?? '')
      setMyId(d.userId ?? null)
    })
  }, [])

  const user = users.find(u => u.id === Number(id))
  const manager = user?.manager_id ? users.find(u => u.id === user.manager_id) : null
  const reports = users.filter(u => u.manager_id === Number(id))
  const canEdit = myRole === 'admin' || myRole === 'manager'
  const isSelf = myId === Number(id)

  const startEdit = () => {
    if (!user) return
    setEditPosition(user.position)
    setEditManagerId(user.manager_id)
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!user) return
    setSaving(true)
    await fetch('/api/org', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, position: editPosition, manager_id: editManagerId }),
    })
    setUsers(prev => prev.map(u =>
      u.id === user.id ? { ...u, position: editPosition, manager_id: editManagerId } : u
    ))
    setSaving(false)
    setEditing(false)
  }

  const startMemoEdit = () => {
    setMemoText(user?.profile_memo ?? '')
    setEditingMemo(true)
  }

  const saveMemo = async () => {
    if (!user) return
    setSavingMemo(true)
    await fetch('/api/org', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user.id, profile_memo: memoText }),
    })
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, profile_memo: memoText } : u))
    setSavingMemo(false)
    setEditingMemo(false)
  }

  if (!user && users.length > 0) {
    return (
      <div className="p-6 text-center text-gray-400">ユーザーが見つかりません</div>
    )
  }

  if (!user) {
    return <div className="p-6 text-center text-gray-400">読み込み中...</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <button
        onClick={() => router.push('/org')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-500 transition mb-4"
      >
        <ArrowLeft size={16} />組織図に戻る
      </button>

      {/* プロフィールカード */}
      <div className={`rounded-2xl p-6 mb-4 text-white shadow-md ${
        user.role === 'admin'
          ? 'bg-gradient-to-br from-violet-500 to-purple-600'
          : user.role === 'manager'
          ? 'bg-gradient-to-br from-blue-400 to-indigo-500'
          : 'bg-gradient-to-br from-gray-500 to-gray-600'
      }`}>
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img src={user.avatar} className="w-16 h-16 rounded-full object-cover ring-2 ring-white/30" alt="" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {user.name[0]}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-white/80 text-sm mt-0.5">{positionLabel(user)}</p>
          </div>
        </div>
      </div>

      {/* 詳細 */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 divide-y divide-gray-50">
        {/* 上長 */}
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">上長</span>
          {manager ? (
            <button
              onClick={() => router.push(`/org/${manager.id}`)}
              className="flex items-center gap-2 text-sm font-medium text-violet-600 hover:underline"
            >
              {manager.avatar && (
                <img src={manager.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
              )}
              {manager.name}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${roleColor(manager.role)}`}>
                {positionLabel(manager)}
              </span>
            </button>
          ) : (
            <span className="text-sm text-gray-300">-</span>
          )}
        </div>

        {/* 部下 */}
        {reports.length > 0 && (
          <div className="px-5 py-4">
            <span className="text-sm text-gray-500 block mb-3">部下 ({reports.length}名)</span>
            <div className="flex flex-col gap-2">
              {reports.map(r => (
                <button
                  key={r.id}
                  onClick={() => router.push(`/org/${r.id}`)}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition text-left"
                >
                  {r.avatar ? (
                    <img src={r.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                      {r.name[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-400">{positionLabel(r)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* メモ */}
      <div className="mt-4 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500">メモ</span>
          {(isSelf || canEdit) && !editingMemo && (
            <button
              onClick={startMemoEdit}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-violet-500 transition"
            >
              <Pencil size={11} />編集
            </button>
          )}
        </div>
        {editingMemo ? (
          <div className="space-y-2">
            <textarea
              value={memoText}
              onChange={e => setMemoText(e.target.value)}
              rows={4}
              placeholder="スキル、一言、連絡先など自由に記入"
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingMemo(false)}
                className="flex-1 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={saveMemo}
                disabled={savingMemo}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-violet-600"
              >
                <Save size={11} />{savingMemo ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : user.profile_memo ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{user.profile_memo}</p>
        ) : (
          <p className="text-sm text-gray-300">{isSelf || canEdit ? '「編集」からメモを追加できます' : '未記入'}</p>
        )}
      </div>

      {/* 編集 */}
      {canEdit && !editing && (
        <button
          onClick={startEdit}
          className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 border border-gray-200 text-gray-500 text-sm rounded-xl hover:bg-gray-50 transition"
        >
          <Pencil size={14} />編集
        </button>
      )}

      {editing && (
        <div className="mt-4 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500">編集</p>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">役職名</label>
            <input
              type="text"
              value={editPosition}
              onChange={e => setEditPosition(e.target.value)}
              placeholder="例: 代表、リーダー"
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
              autoFocus
            />
          </div>
          {user.role !== 'admin' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">上長</label>
              <select
                value={editManagerId ?? ''}
                onChange={e => setEditManagerId(e.target.value ? Number(e.target.value) : null)}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="">なし（最上位）</option>
                {users.filter(u => u.id !== user.id).map(u => (
                  <option key={u.id} value={u.id}>{u.name}（{positionLabel(u)}）</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-violet-600"
            >
              <Save size={12} />{saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
