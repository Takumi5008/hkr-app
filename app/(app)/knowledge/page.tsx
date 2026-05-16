'use client'

import { useState, useEffect, useRef } from 'react'
import { upload } from '@vercel/blob/client'
import { Mic, Film, FileText, Download, Trash2, Plus, X, Loader2, Upload, GraduationCap, Play, Pause, ChevronDown, ChevronUp, ClipboardList, Square } from 'lucide-react'

type Category = 'recording' | 'course' | 'minutes'
type FileType = 'audio' | 'video' | 'pdf' | 'text'
type RecordingSubTab = 'all' | '獲得録音' | '失注録音' | '後確認後録音'

const RECORDING_SUBTABS: { id: RecordingSubTab; label: string }[] = [
  { id: 'all', label: '全て' },
  { id: '獲得録音', label: '獲得録音' },
  { id: '失注録音', label: '失注録音' },
  { id: '後確認後録音', label: '後確認後録音' },
]

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
  content: string
  subcategory: string
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ type, hasContent }: { type: FileType; hasContent?: boolean }) {
  if (type === 'audio') return <Mic size={16} className="text-violet-500" />
  if (type === 'video') return <Film size={16} className="text-blue-500" />
  if (type === 'text' && hasContent) return <FileText size={16} className="text-amber-500" />
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

type KUser = { id: number; name: string }

export default function KnowledgePage() {
  const [tab, setTab] = useState<Category>('recording')
  const [recordingSubTab, setRecordingSubTab] = useState<RecordingSubTab>('all')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState<string>('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', fileType: 'audio' as FileType, content: '', subcategory: '' })
  const [file, setFile] = useState<File | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [members, setMembers] = useState<KUser[]>([])
  const [selectedUploader, setSelectedUploader] = useState<number | null>(null)

  // マイク録音
  const [isRecording, setIsRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const canUpload = !!myRole
  const canDelete = myRole === 'manager' || myRole === 'admin'

  // テキスト直接入力モードかどうか
  const isTextMode = form.fileType === 'text' || tab === 'minutes'

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setMyRole(d.role ?? '')
      if (d.role === 'manager' || d.role === 'admin') {
        fetch('/api/users').then(r => r.json()).then((users: KUser[]) => {
          setMembers(users.filter((u: any) => u.role !== 'viewer'))
        })
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const uploaderParam = selectedUploader ? `&uploadedBy=${selectedUploader}` : ''
    fetch(`/api/knowledge?category=${tab}${uploaderParam}`)
      .then(r => r.json())
      .then(data => { setMaterials(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab, selectedUploader])

  // iOSの共有シートから音声ファイルが渡された場合の処理
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('share') !== '1') return
    window.history.replaceState({}, '', '/knowledge')

    fetch('/share-target-file').then(async (res) => {
      if (!res.ok) return
      const blob = await res.blob()
      const fileName = decodeURIComponent(res.headers.get('X-File-Name') || 'recording.m4a')
      const sharedTitle = decodeURIComponent(res.headers.get('X-Share-Title') || '')
      const audioFile = new File([blob], fileName, { type: blob.type || 'audio/mpeg' })
      setFile(audioFile)
      setTab('recording')
      setRecordingSubTab('獲得録音')
      setForm({
        title: sharedTitle,
        description: '',
        fileType: 'audio',
        content: '',
        subcategory: '獲得録音',
      })
      setShowUpload(true)
    }).catch(() => {})
  }, [])

  // 録音タイマー
  useEffect(() => {
    if (!isRecording) return
    const id = setInterval(() => setRecSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [isRecording])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        const ext = mr.mimeType.includes('mp4') ? 'm4a' : 'webm'
        const recorded = new File([blob], `録音_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '')}.${ext}`, { type: blob.type })
        setFile(recorded)
        setForm({ title: '', description: '', fileType: 'audio', content: '', subcategory: recordingSubTab !== 'all' ? recordingSubTab : '獲得録音' })
        setShowUpload(true)
        setIsRecording(false)
        setRecSeconds(0)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setIsRecording(true)
      setRecSeconds(0)
    } catch {
      alert('マイクの使用が許可されていません。設定から許可してください。')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
  }

  function fmtSec(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  // タブ切り替え時にフォームのデフォルトfileTypeを調整
  function openUpload() {
    setForm({
      title: '',
      description: '',
      fileType: tab === 'recording' ? 'audio' : tab === 'minutes' ? 'text' : 'video',
      content: '',
      subcategory: tab === 'recording' && recordingSubTab !== 'all' ? recordingSubTab : '',
    })
    setFile(null)
    setUploadProgress(null)
    if (fileRef.current) fileRef.current.value = ''
    setShowUpload(true)
  }

  function resetForm() {
    setForm({ title: '', description: '', fileType: 'audio', content: '', subcategory: '' })
    setFile(null)
    setUploadProgress(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDownload(e: React.MouseEvent, url: string, filename: string) {
    e.preventDefault()
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  async function handleUpload() {
    if (!form.title) return
    setUploading(true)
    try {
      if (isTextMode) {
        if (!form.content.trim()) { setUploading(false); return }
        await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            category: tab,
            fileType: 'text',
            url: '',
            fileName: '',
            fileSize: form.content.length,
            content: form.content,
            subcategory: form.subcategory,
          }),
        })
      } else {
        if (!file) { setUploading(false); return }
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
            subcategory: form.subcategory,
          }),
        })
      }

      const res = await fetch(`/api/knowledge?category=${tab}`)
      const data = await res.json()
      setMaterials(Array.isArray(data) ? data : [])
      setShowUpload(false)
      resetForm()
    } catch (e: any) {
      const msg = e?.message ?? '不明なエラー'
      alert(`アップロードに失敗しました。\n\nエラー: ${msg}\n\nファイル形式: ${file?.type || '不明'}\nファイルサイズ: ${file ? Math.round(file.size / 1024) + 'KB' : '不明'}`)
    }
    setUploading(false)
  }

  async function handleDelete(id: number) {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
    setMaterials(prev => prev.filter(m => m.id !== id))
  }

  const accept = {
    audio: 'audio/*,.m4a,.mp3,.wav,.aac,.caf,.aiff,.flac,.mp4,.wma',
    video: 'video/*,.mp4,.mov,.m4v',
    pdf: 'application/pdf,.pdf',
    text: 'text/plain,.txt',
  }[form.fileType]

  const tabs: { id: Category; label: string }[] = [
    { id: 'recording', label: '🎙️ 録音' },
    { id: 'course', label: '📚 インフラ講座' },
    { id: 'minutes', label: '📝 週次MTG議事録' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-6 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-200 mb-1">Knowledge</p>
        <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap size={22} />知識向上</h1>
        <p className="text-sm text-violet-200 mt-0.5">録音・インフラ講座・議事録コンテンツ</p>
      </div>

      {/* メンバー選択（マネージャー・管理者のみ） */}
      {(myRole === 'manager' || myRole === 'admin') && members.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedUploader(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedUploader === null ? 'bg-violet-600 text-white shadow' : 'bg-white text-gray-500 border border-gray-200 hover:bg-violet-50'}`}
          >
            全員
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedUploader(m.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedUploader === m.id ? 'bg-violet-600 text-white shadow' : 'bg-white text-gray-500 border border-gray-200 hover:bg-violet-50'}`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* タブ */}
      <div className="flex flex-wrap gap-1 mb-5 bg-gray-100 p-1 rounded-lg">
        {tabs.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 録音サブタブ */}
      {tab === 'recording' && (
        <div className="mb-4">
          <span className="text-xs text-gray-400 font-medium mr-2">絞り込み:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {RECORDING_SUBTABS.map(({ id, label }) => (
              <button key={id} onClick={() => setRecordingSubTab(id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap border ${
                  recordingSubTab === id
                    ? 'bg-violet-500 text-white border-violet-500'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300 hover:text-violet-600'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 投稿ボタン */}
      {canUpload && (
        <button onClick={openUpload}
          className="mb-5 flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm">
          <Plus size={15} />{tab === 'minutes' ? '議事録を投稿' : 'ファイルをアップロード'}
        </button>
      )}

      {/* 素材リスト */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" />読み込み中...</div>
      ) : (() => {
        const filtered = tab === 'recording' && recordingSubTab !== 'all'
          ? materials.filter(m => m.subcategory === recordingSubTab)
          : materials
        return filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <GraduationCap size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">まだコンテンツがありません</p>
            {canUpload && <p className="text-xs mt-1">{tab === 'minutes' ? '「議事録を投稿」ボタンから追加できます' : '「アップロード」ボタンから追加できます'}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(m => {
            const hasContent = !!m.content
            const isExpanded = expandedId === m.id
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <FileIcon type={m.file_type} hasContent={hasContent} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{m.title}</p>
                      {m.subcategory && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 shrink-0">{m.subcategory}</span>
                      )}
                    </div>
                    {m.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.description}</p>}
                    {/* テキストコンテンツのプレビュー（折りたたみ時） */}
                    {hasContent && !isExpanded && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 whitespace-pre-line">{m.content}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-gray-400">{m.uploader_name}</span>
                      <span className="text-[10px] text-gray-300">·</span>
                      <span className="text-[10px] text-gray-400">{m.created_at.slice(0, 10)}</span>
                      {!hasContent && (
                        <>
                          <span className="text-[10px] text-gray-300">·</span>
                          <span className="text-[10px] text-gray-400">{formatBytes(m.file_size)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 relative z-10">
                    {(m.file_type === 'audio' || m.file_type === 'video' || hasContent) && (
                      <button onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-violet-600 transition-colors active:bg-gray-100">
                        {isExpanded
                          ? (hasContent ? <ChevronUp size={16} /> : <Pause size={16} />)
                          : (hasContent ? <ChevronDown size={16} /> : <Play size={16} />)
                        }
                      </button>
                    )}
                    {m.url && (
                      <button onClick={(e) => handleDownload(e, m.url, m.file_name)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-indigo-600 transition-colors active:bg-gray-100">
                        <Download size={16} />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(m.id)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors active:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                {isExpanded && m.file_type === 'audio' && m.url && <AudioPlayer url={m.url} />}
                {isExpanded && m.file_type === 'video' && m.url && <VideoPlayer url={m.url} />}
                {isExpanded && hasContent && (
                  <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                )}
              </div>
            )
          })}
          </div>
        )
      })()}

      {/* アップロード／投稿モーダル */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {tab === 'minutes' ? '議事録を投稿' : isTextMode ? 'テキストを投稿' : 'ファイルをアップロード'}
              </h2>
              <button onClick={() => { setShowUpload(false); resetForm() }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">タイトル <span className="text-red-400">*</span></label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder={tab === 'minutes' ? '例：2024年11月22日 週次MTG' : '例：インフラ講座 第3回'} />
              </div>
              {tab !== 'minutes' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">説明（任意）</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" placeholder="内容の説明..." />
                </div>
              )}

              {/* 録音種別（recordingタブのみ） */}
              {tab === 'recording' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">録音種別 <span className="text-red-400">*</span></label>
                  <select value={form.subcategory} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                    <option value="">未分類</option>
                    <option value="獲得録音">獲得録音</option>
                    <option value="失注録音">失注録音</option>
                    <option value="後確認後録音">後確認後録音</option>
                  </select>
                </div>
              )}

              {/* ファイル種類（minutes/recording以外のみ） */}
              {tab !== 'minutes' && tab !== 'recording' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">種類 <span className="text-red-400">*</span></label>
                  <select value={form.fileType} onChange={e => { setForm(f => ({ ...f, fileType: e.target.value as FileType })); setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                    <>
                      <option value="video">🎬 動画（MP4・MOV）</option>
                      <option value="pdf">📄 PDF</option>
                      <option value="text">📝 テキスト直接入力</option>
                      <option value="audio">🎵 音声</option>
                    </>
                  </select>
                </div>
              )}

              {/* テキスト入力 or ファイル選択 */}
              {isTextMode ? (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {tab === 'minutes' ? '議事録内容' : 'テキスト'} <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={form.content}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    rows={10}
                    placeholder={tab === 'minutes' ? '議事録をここに貼り付けてください...' : 'テキストをここに入力または貼り付けてください...'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y"
                  />
                </div>
              ) : (
                <div>
                  <p className="block text-xs font-medium text-gray-700 mb-1">ファイル <span className="text-red-400">*</span></p>
                  <label htmlFor="knowledge-file-input"
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
                        <p className="text-xs text-gray-400">タップしてファイルを選択</p>
                      </>
                    )}
                  </label>
                  <input id="knowledge-file-input" ref={fileRef} type="file" accept={tab === 'recording' ? '*/*' : accept} className="hidden"
                    onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </div>
              )}

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
              <button
                onClick={handleUpload}
                disabled={!form.title || uploading || (isTextMode ? !form.content.trim() : !file)}
                className="flex-1 py-2.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                {uploading
                  ? <><Loader2 size={14} className="animate-spin" />保存中</>
                  : isTextMode
                  ? <><ClipboardList size={14} />投稿する</>
                  : <><Upload size={14} />アップロード</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
