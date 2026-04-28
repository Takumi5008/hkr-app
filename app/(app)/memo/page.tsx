'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, FileText, ChevronLeft } from 'lucide-react'
import { useConfirm } from '@/components/useConfirm'

type Memo = {
  id: number
  title: string
  content: string
  updated_at: string
}

export default function MemoPage() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [memos, setMemos] = useState<Memo[]>([])
  const [selected, setSelected] = useState<Memo | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/memos').then((r) => r.json()).then(setMemos)
  }, [])

  const handleNew = async () => {
    const res = await fetch('/api/memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '', content: '' }),
    })
    const memo = await res.json()
    setMemos((prev) => [memo, ...prev])
    openMemo(memo)
  }

  const openMemo = (memo: Memo) => {
    setSelected(memo)
    setTitle(memo.title)
    setContent(memo.content)
  }

  const handleBack = () => {
    setSelected(null)
  }

  const autoSave = (newTitle: string, newContent: string) => {
    if (!selected) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/memos/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      })
      const updated = await res.json()
      setMemos((prev) => prev.map((m) => m.id === updated.id ? updated : m)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
      setSelected(updated)
      setSaving(false)
    }, 600)
  }

  const handleTitleChange = (v: string) => {
    setTitle(v)
    autoSave(v, content)
  }

  const handleContentChange = (v: string) => {
    setContent(v)
    autoSave(title, v)
  }

  const handleDelete = async (id: number) => {
    if (!await confirm('このメモを削除しますか？')) return
    await fetch(`/api/memos/${id}`, { method: 'DELETE' })
    setMemos((prev) => prev.filter((m) => m.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // メモ編集画面
  if (selected) {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={handleBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition">
            <ChevronLeft size={18} />一覧へ
          </button>
          <span className="ml-auto text-xs text-gray-400">
            {saving ? '保存中...' : '自動保存'}
          </span>
          <button onClick={() => handleDelete(selected.id)} className="text-gray-300 hover:text-rose-400 transition p-1">
            <Trash2 size={16} />
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="タイトル"
            className="w-full px-5 pt-5 pb-2 text-lg font-bold text-gray-800 focus:outline-none placeholder-gray-300"
          />
          <div className="px-5 pb-2">
            <div className="w-full h-px bg-gray-100" />
          </div>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="メモを入力..."
            rows={18}
            className="w-full px-5 py-3 text-sm text-gray-700 focus:outline-none placeholder-gray-300 resize-none leading-relaxed"
          />
        </div>
      </div>
    )
  }

  // メモ一覧画面
  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      {ConfirmDialog}
      <div className="mb-6 bg-gradient-to-r from-yellow-500 to-amber-400 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-100 mb-1">Memo</p>
        <h1 className="text-2xl font-bold">メモ</h1>
      </div>

      <button
        onClick={handleNew}
        className="w-full flex items-center gap-2 px-4 py-3 mb-5 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 text-gray-400 hover:text-yellow-600 hover:ring-yellow-200 transition text-sm font-medium"
      >
        <Plus size={18} />
        新しいメモ
      </button>

      {memos.length === 0 && (
        <div className="text-center py-16 text-gray-300">
          <FileText size={48} className="mx-auto mb-3" />
          <p className="text-sm font-medium">メモがありません</p>
        </div>
      )}

      <div className="space-y-2">
        {memos.map((memo) => (
          <button
            key={memo.id}
            onClick={() => openMemo(memo)}
            className="w-full text-left bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 px-4 py-3.5 hover:ring-yellow-200 hover:shadow-md transition group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {memo.title || '（タイトルなし）'}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {memo.content || '（内容なし）'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-300">{formatDate(memo.updated_at)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(memo.id) }}
                  className="text-gray-200 hover:text-rose-400 transition opacity-0 group-hover:opacity-100 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
