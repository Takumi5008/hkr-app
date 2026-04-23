'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckCircle2, Circle, AlertCircle, Clock, CalendarCheck } from 'lucide-react'

type Task = {
  id: number
  title: string
  due_date: string | null
  done: number
  done_at: string | null
  created_at: string
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    fetch('/api/tasks').then((r) => r.json()).then(setTasks)
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), dueDate: newDueDate || null }),
    })
    if (res.ok) {
      const task = await res.json()
      setTasks((prev) => [task, ...prev].sort((a, b) => {
        if (a.done !== b.done) return a.done - b.done
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }))
      setNewTitle('')
      setNewDueDate('')
      setShowForm(false)
    }
    setAdding(false)
  }

  const handleToggle = async (task: Task) => {
    const done = !task.done
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTasks((prev) => prev.map((t) => t.id === task.id ? updated : t)
        .sort((a, b) => {
          if (a.done !== b.done) return a.done - b.done
          if (!a.due_date && !b.due_date) return 0
          if (!a.due_date) return 1
          if (!b.due_date) return -1
          return a.due_date.localeCompare(b.due_date)
        }))
    }
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const formatDue = (date: string) => {
    const d = new Date(date + 'T00:00:00')
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  const getDueStatus = (task: Task) => {
    if (task.done) return 'done'
    if (!task.due_date) return 'none'
    if (task.due_date < today) return 'overdue'
    if (task.due_date === today) return 'today'
    return 'upcoming'
  }

  const pending = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)
  const urgent = pending.filter((t) => getDueStatus(t) === 'overdue' || getDueStatus(t) === 'today')
  const upcoming = pending.filter((t) => getDueStatus(t) === 'upcoming' || getDueStatus(t) === 'none')

  const TaskItem = ({ task }: { task: Task }) => {
    const status = getDueStatus(task)
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${task.done ? 'opacity-50' : ''}`}>
        <button onClick={() => handleToggle(task)} className="shrink-0 transition-transform active:scale-90">
          {task.done
            ? <CheckCircle2 size={22} className="text-emerald-500" />
            : <Circle size={22} className="text-gray-300 hover:text-indigo-400" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </p>
          {task.due_date && (
            <span className={`text-xs font-semibold mt-0.5 flex items-center gap-1 w-fit ${
              status === 'overdue' ? 'text-rose-500' :
              status === 'today'   ? 'text-amber-500' :
              status === 'done'    ? 'text-gray-400'  : 'text-gray-400'
            }`}>
              {status === 'overdue' && <AlertCircle size={11} />}
              {status === 'today' && <Clock size={11} />}
              {status === 'upcoming' && <CalendarCheck size={11} />}
              {status === 'overdue' ? `期限切れ（${formatDue(task.due_date)}）` :
               status === 'today'   ? `今日まで（${formatDue(task.due_date)}）` :
               `${formatDue(task.due_date)}まで`}
            </span>
          )}
        </div>
        <button onClick={() => handleDelete(task.id)} className="shrink-0 text-gray-200 hover:text-rose-400 transition-colors p-1">
          <Trash2 size={15} />
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto">
      <div className="mb-6 bg-gradient-to-r from-violet-600 to-purple-500 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Tasks</p>
        <h1 className="text-2xl font-bold">タスク管理</h1>
      </div>

      {/* タスク追加 */}
      {showForm ? (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 mb-5">
          <input
            type="text"
            placeholder="タスクを入力"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 mb-2"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">期限</label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              min={today}
              className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={() => { setShowForm(false); setNewTitle(''); setNewDueDate('') }}
              className="flex-1 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-xl hover:bg-gray-50 transition">
              キャンセル
            </button>
            <button type="submit" disabled={adding || !newTitle.trim()}
              className="flex-1 py-2 bg-gradient-to-r from-violet-600 to-purple-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition shadow-sm">
              追加
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center gap-2 px-4 py-3 mb-5 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 text-gray-400 hover:text-violet-600 hover:ring-violet-200 transition text-sm font-medium">
          <Plus size={18} />
          タスクを追加
        </button>
      )}

      {/* 今やるべきタスク */}
      {urgent.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-rose-100 mb-4 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border-b border-rose-100">
            <AlertCircle size={15} className="text-rose-500" />
            <h2 className="text-sm font-bold text-rose-700">今やるべきタスク</h2>
            <span className="ml-auto text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold">{urgent.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {urgent.map((task) => <TaskItem key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* 今後のタスク */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 mb-4 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <Clock size={15} className="text-indigo-500" />
            <h2 className="text-sm font-bold text-gray-700">今後のタスク</h2>
            <span className="ml-auto text-xs text-gray-400 font-medium">{upcoming.length}件</span>
          </div>
          <div className="divide-y divide-gray-50">
            {upcoming.map((task) => <TaskItem key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* 完了済み */}
      {done.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <h2 className="text-sm font-bold text-gray-500">完了済み</h2>
            <span className="ml-auto text-xs text-gray-400 font-medium">{done.length}件</span>
          </div>
          <div className="divide-y divide-gray-50">
            {done.map((task) => <TaskItem key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-16 text-gray-300">
          <CheckCircle2 size={48} className="mx-auto mb-3" />
          <p className="text-sm font-medium">タスクがありません</p>
        </div>
      )}
    </div>
  )
}
