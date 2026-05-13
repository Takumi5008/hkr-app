'use client'

import { useState, useEffect, useRef } from 'react'
import { upload } from '@vercel/blob/client'
import { Mic, Film, FileText, Download, Trash2, Plus, X, Loader2, Upload, GraduationCap, Play, Pause } from 'lucide-react'

type Category = 'recording' | 'course'
type FileType = 'audio' | 'video' | 'pdf' | 'text'

interface Material {
  id: number
  title: string
  description: string
  category: Category
  file_type: FileType
  url: string
  file_name: string
  file_size: number
  uploader_name: string
  created_at: string
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ type }: { type: FileType }) {
  if (type === 'audio') return <Mic size={16} className="text-violet-500" />
  if (type === 'video') return <Film size={16} className="text-blue-500" />
  return <FileText size={16} className="text-emerald-500" />
}

function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  function toggle() {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.play(); setPlaying(true) }
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  return (
    <div className="mt-3 flex items-center gap-3 bg-violet-50 rounded-xl px-4 py-2.5">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => setProgress(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />
      <button onClick={toggle} className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center shrink-0 hover:bg-violet-600 transition-colors">
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <input
        type="range" min={0} max={duration || 1} value={progress} step={0.1}
        onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value) }}
        className="flex-1 accent-violet-500 h-1.5"
      />
      <span className="text-xs text-gray-400 shrink-0 tabular-nums">{fmt(progress)}/{fmt(duration)}</span>
    </div>
  )
}

function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="mt-3 rounded-xl overflow-hidden bg-black">
      <video src={url} controls className="w-full max-h-64" preload="metadata" />
    </div>
  )
}

export default function KnowledgePage() {
  const [tab, setTab] = useState<Category>('recording')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState<string>('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', fileType: 'audio' as FileType })
  const [file, setFile] = useState<File | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const canUpload = !!myRole
  const canDelete = myRole === 'manager' || myRole === 'admin'

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setMyRole(d.role ?? '')).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/knowledge?category=${tab}`)
      .then(r => r.json())
      .then(data => { setMaterials(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab])

  function resetForm() {
    setForm({ title: '', description: '', fileType: 'audio' })
    setFile(null)
    setUploadProgress(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleUpload() {
    if (!file || !form.title) return
    setUploading(true)
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/knowledge/upload',
        onUploadProgress: ({ percentage }) => setUploadProgress(percentage),
      })

      await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: tab,
          fileType: form.fileType,
          url: blob.url,
          fileName: file.name,
          fileSize: file.size,
        }),
      })

      const res = await fetch(`/api/knowledge?category=${tab}`)
      const data = await res.json()
      setMaterials(Array.isArray(data) ? data : [])
      setShowUpload(false)
      resetForm()
    } catch (e: any) {
      alert(`アップロードに失敗しました: ${e?.message ?? '不明なエラー'}`)
    }
    setUploading(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
    setMaterials(prev => prev.filter(m => m.id !== id))
  }

  const accept = {
    audio: 'audio/*',
    video: 'video/*',
    pdf: 'application/pdf',
    text: 'text/plain',
  }[form.fileType]

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Knowledge</p>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap size={22} />知識向上</h1>
        <p className="text-sm text-violet-200 mt-0.5">録音・インフラ講座コンテンツ</p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {([['recording', '🎙️ 録音'], ['course', '📚 インフラ講座']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* アップロードボタン */}
      {canUpload && (
        <button onClick={() => setShowUpload(true)}
          className="mb-5 flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm">
          <Plus size={15} />アップロード
        </button>
      )}

      {/* 素材リスト */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" />読み込み中...</div>
      ) : materials.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">まだコンテンツがありません</p>
          {canUpload && <p className="text-xs mt-1">「アップロード」ボタンから追加できます</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map(m => (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                  <FileIcon type={m.file_type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{m.title}</p>
                  {m.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.description}</p>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-gray-400">{m.uploader_name}</span>
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className="text-[10px] text-gray-400">{m.created_at.slice(0, 10)}</span>
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className="text-[10px] text-gray-400">{formatBytes(m.file_size)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(m.file_type === 'audio' || m.file_type === 'video') && (
                    <button onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-violet-600 transition-colors">
                      {expandedId === m.id ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                  )}
                  <a href={m.url} download={m.file_name} target="_blank" rel="noreferrer"
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-colors">
                    <Download size={15} />
                  </a>
                  {canDelete && (
                    <button onClick={() => handleDelete(m.id)}
                      className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
              {expandedId === m.id && m.file_type === 'audio' && <AudioPlayer url={m.url} />}
              {expandedId === m.id && m.file_type === 'video' && <VideoPlayer url={m.url} />}
            </div>
          ))}
        </div>
      )}

      {/* アップロードモーダル */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">ファイルをアップロード</h2>
              <button onClick={() => { setShowUpload(false); resetForm() }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">タイトル <span className="text-red-400">*</span></label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" placeholder="例：2024年11月 営業会議録音" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">説明（任意）</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" placeholder="内容の説明..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ファイルの種類 <span className="text-red-400">*</span></label>
                <select value={form.fileType} onChange={e => { setForm(f => ({ ...f, fileType: e.target.value as FileType })); setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                  {tab === 'recording' ? (
                    <option value="audio">🎵 音声ファイル（MP3・WAV・M4A）</option>
                  ) : (
                    <>
                      <option value="video">🎬 動画（MP4・MOV）</option>
                      <option value="pdf">📄 PDF</option>
                      <option value="text">📝 テキスト</option>
                      <option value="audio">🎵 音声</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ファイル <span className="text-red-400">*</span></label>
                <div onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-6 cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors">
                  {file ? (
                    <>
                      <Upload size={20} className="text-violet-500 mb-1" />
                      <p className="text-sm font-medium text-gray-700 text-center px-2 break-all">{file.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatBytes(file.size)}</p>
                    </>
                  ) : (
                    <>
                      <Upload size={20} className="text-gray-300 mb-1" />
                      <p className="text-xs text-gray-400">クリックしてファイルを選択</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept={accept} className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </div>

              {uploadProgress !== null && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>アップロード中...</span><span>{uploadProgress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <button onClick={() => { setShowUpload(false); resetForm() }} disabled={uploading}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                キャンセル
              </button>
              <button onClick={handleUpload} disabled={!file || !form.title || uploading}
                className="flex-1 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                {uploading ? <><Loader2 size={14} className="animate-spin" />アップロード中</> : <><Upload size={14} />アップロード</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
