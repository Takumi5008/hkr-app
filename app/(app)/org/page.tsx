'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, X, Plus, ArrowUpToLine } from 'lucide-react'

type OrgUser = {
  id: number
  name: string
  role: string
  position: string
  manager_id: number | null
  org_visible: boolean
  avatar: string | null
}

type OrgNode = OrgUser & { children: OrgNode[]; depth: number }

function posLabel(u: OrgUser) {
  if (u.position) return u.position
  if (u.role === 'admin') return '代表'
  if (u.role === 'manager') return 'マネージャー'
  return 'メンバー'
}

const depthStyle = (depth: number, selected: boolean, moving: boolean) => {
  const base = selected
    ? 'ring-2 ring-amber-400 shadow-lg scale-105'
    : moving
    ? 'ring-2 ring-amber-200 opacity-60'
    : ''
  if (depth === 0) return `bg-gradient-to-br from-violet-500 to-purple-600 text-white ${base}`
  if (depth === 1) return `bg-gradient-to-br from-blue-400 to-indigo-500 text-white ${base}`
  return `bg-white ring-1 ring-gray-200 text-gray-700 hover:ring-violet-300 ${base}`
}

function buildTree(users: OrgUser[], parentId: number | null, depth: number, visited = new Set<number>()): OrgNode[] {
  return users
    .filter(u => u.org_visible && u.manager_id === parentId && !visited.has(u.id))
    .map(u => {
      const nextVisited = new Set(visited).add(u.id)
      return { ...u, depth, children: buildTree(users, u.id, depth + 1, nextVisited) }
    })
}

interface NodeCardProps {
  node: OrgNode
  editMode: boolean
  isMoving: boolean
  isTarget: boolean
  onTap: (u: OrgUser) => void
  onRemove: (u: OrgUser) => void
}

function NodeCard({ node, editMode, isMoving, isTarget, onTap, onRemove }: NodeCardProps) {
  const isLight = node.depth >= 2
  return (
    <div className="relative">
      <button
        onClick={() => onTap(node)}
        className={`rounded-xl px-3 py-2.5 text-center shadow-sm transition-all min-w-[80px] max-w-[120px] ${depthStyle(node.depth, isMoving, false)} ${
          editMode && isTarget ? 'ring-2 ring-green-400' : ''
        }`}
      >
        {node.avatar && (
          <img src={node.avatar} className="w-7 h-7 rounded-full mx-auto mb-1 object-cover" alt="" />
        )}
        {!node.avatar && (
          <div className={`w-7 h-7 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold ${
            node.depth < 2 ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
          }`}>
            {node.name[0]}
          </div>
        )}
        <div className="text-[11px] font-bold leading-tight break-words">{node.name}</div>
        <div className={`text-[10px] mt-0.5 ${node.depth < 2 ? 'text-white/70' : 'text-gray-400'}`}>
          {posLabel(node)}
        </div>
      </button>
      {editMode && (
        <button
          onClick={() => onRemove(node)}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white shadow"
        >
          <X size={9} strokeWidth={3} />
        </button>
      )}
    </div>
  )
}

interface BranchProps {
  node: OrgNode
  editMode: boolean
  movingId: number | null
  onTap: (u: OrgUser) => void
  onRemove: (u: OrgUser) => void
}

function Branch({ node, editMode, movingId, onTap, onRemove }: BranchProps) {
  const isMoving = movingId === node.id
  const isTarget = editMode && movingId !== null && movingId !== node.id

  return (
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <NodeCard node={node} editMode={editMode} isMoving={isMoving} isTarget={isTarget} onTap={onTap} onRemove={onRemove} />
      </div>
      {node.children.length > 0 && (
        <div className="ml-6 pl-6 border-l border-gray-200 flex flex-col gap-4">
          {node.children.map(child => (
            <div key={child.id} className="relative flex items-center">
              {/* 横アーム */}
              <div className="absolute -left-6 top-1/2 w-6 h-px bg-gray-200 -translate-y-px" />
              <Branch node={child} editMode={editMode} movingId={movingId} onTap={onTap} onRemove={onRemove} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OrgPage() {
  const router = useRouter()
  const [users, setUsers] = useState<OrgUser[]>([])
  const [myRole, setMyRole] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [movingId, setMovingId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/org').then(r => r.json()).then(setUsers)
    fetch('/api/progress').then(r => r.json()).then(d => setMyRole(d.role ?? ''))
  }, [])

  const canEdit = myRole === 'admin' || myRole === 'manager'
  const visibleUsers = users.filter(u => u.org_visible)
  const hiddenUsers = users.filter(u => !u.org_visible)
  const roots = buildTree(visibleUsers, null, 0)

  const patch = useCallback(async (id: number, data: Partial<OrgUser>) => {
    await fetch('/api/org', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    })
  }, [])

  const handleTap = (user: OrgUser) => {
    if (!editMode) {
      router.push(`/org/${user.id}`)
      return
    }
    if (movingId === null) {
      setMovingId(user.id)
      return
    }
    if (movingId === user.id) {
      setMovingId(null)
      return
    }
    // 移動先に設定
    setUsers(prev => prev.map(u => u.id === movingId ? { ...u, manager_id: user.id } : u))
    patch(movingId, { manager_id: user.id })
    setMovingId(null)
  }

  const moveToRoot = () => {
    if (movingId === null) return
    setUsers(prev => prev.map(u => u.id === movingId ? { ...u, manager_id: null } : u))
    patch(movingId, { manager_id: null })
    setMovingId(null)
  }

  const removeFromOrg = (user: OrgUser) => {
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, org_visible: false } : u))
    patch(user.id, { org_visible: false })
    if (movingId === user.id) setMovingId(null)
  }

  const addToOrg = (user: OrgUser) => {
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, org_visible: true } : u))
    patch(user.id, { org_visible: true })
  }

  const movingUser = movingId ? users.find(u => u.id === movingId) : null

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-5 flex items-start justify-between">
        <div className="bg-gradient-to-r from-violet-600 to-purple-500 rounded-2xl px-5 py-4 shadow-md text-white flex-1 mr-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-0.5">Organization</p>
          <h1 className="text-xl font-bold">組織図</h1>
        </div>
        {canEdit && (
          <button
            onClick={() => { setEditMode(e => !e); setMovingId(null) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition shadow-sm ${
              editMode ? 'bg-amber-500 text-white' : 'bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            <Settings size={15} />
            {editMode ? '完了' : '編集'}
          </button>
        )}
      </div>

      {/* 移動モード バナー */}
      {editMode && movingUser && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-700">
            <span className="font-bold">「{movingUser.name}」</span>の移動先をタップ
          </p>
          <div className="flex gap-2">
            <button
              onClick={moveToRoot}
              className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              <ArrowUpToLine size={12} />最上位へ
            </button>
            <button
              onClick={() => setMovingId(null)}
              className="text-xs px-2 py-1 bg-white border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 組織図ツリー */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 overflow-x-auto">
        <div className="flex flex-col gap-6 items-start min-w-max mx-auto">
          {roots.length > 0 ? roots.map(root => (
            <Branch key={root.id} node={root} editMode={editMode} movingId={movingId} onTap={handleTap} onRemove={removeFromOrg} />
          )) : (
            <p className="text-sm text-gray-400 py-10">
              {users.length === 0 ? '読み込み中...' : '組織図にメンバーがいません。編集から追加してください。'}
            </p>
          )}
        </div>
      </div>

      {/* 非表示メンバー（編集モードのみ） */}
      {editMode && hiddenUsers.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">組織図に追加できるメンバー</p>
          <div className="flex gap-2 flex-wrap">
            {hiddenUsers.map(u => (
              <button
                key={u.id}
                onClick={() => addToOrg(u)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 ring-1 ring-gray-200 rounded-xl text-xs text-gray-600 hover:bg-violet-50 hover:ring-violet-300 transition"
              >
                <Plus size={11} />
                {u.name}
                {u.position && <span className="text-gray-400">（{u.position}）</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {editMode && (
        <p className="mt-3 text-center text-xs text-gray-400">
          ノードをタップ → 移動先をタップで位置変更　／　✕で組織図から除外
        </p>
      )}
    </div>
  )
}
