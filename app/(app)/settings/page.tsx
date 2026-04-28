'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, ShieldAlert, Camera, Trash2 } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'
import AccountCard from '@/components/AccountCard'
import { calcHKR } from '@/lib/hkr'

function SettingsContent() {
  const searchParams = useSearchParams()
  const isTempLogin = searchParams.get('reason') === 'temp'

  const [myCard, setMyCard] = useState<any>(null)
  const [myCardStats, setMyCardStats] = useState<any>(null)

  // プロフィール
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)

  // アバター
  const [avatar, setAvatar] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // パスワード
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/my/card-stats').then((r) => r.json()),
    ]).then(([me, stats]) => {
      setName(me.name)
      setEmail(me.email)
      setAvatar(me.avatar ?? null)
      setMyCard({ id: me.id ?? me.userId, name: me.name, avatar: me.avatar ?? null, points: me.points ?? 0, loginCount: me.loginCount ?? 0, lastLoginAt: me.lastLoginAt ?? null })
      setMyCardStats(stats)
    })
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const canvas = document.createElement('canvas')
    const img = document.createElement('img')
    img.onload = () => {
      const size = 150
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      const min = Math.min(img.width, img.height)
      const sx = (img.width - min) / 2
      const sy = (img.height - min) / 2
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      setAvatar(dataUrl)
      uploadAvatar(dataUrl)
    }
    img.src = URL.createObjectURL(file)
    e.target.value = ''
  }

  async function uploadAvatar(dataUrl: string) {
    setAvatarLoading(true)
    await fetch('/api/auth/avatar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: dataUrl }),
    })
    setAvatarLoading(false)
  }

  async function handleDeleteAvatar() {
    setAvatarLoading(true)
    await fetch('/api/auth/avatar', { method: 'DELETE' })
    setAvatar(null)
    setAvatarLoading(false)
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileError('')
    setProfileLoading(true)

    const res = await fetch('/api/auth/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })
    const data = await res.json()

    if (!res.ok) { setProfileError(data.error); setProfileLoading(false); return }

    setProfileSuccess(true)
    setProfileLoading(false)
    setTimeout(() => setProfileSuccess(false), 3000)
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')

    if (newPassword !== confirmPassword) { setPasswordError('新しいパスワードが一致しません'); return }
    if (newPassword.length < 6) { setPasswordError('新しいパスワードは6文字以上で入力してください'); return }

    setPasswordLoading(true)
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    const data = await res.json()

    if (!res.ok) { setPasswordError(data.error); setPasswordLoading(false); return }

    setPasswordSuccess(true)
    setPasswordLoading(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPasswordSuccess(false), 3000)
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      {myCard && myCardStats && (() => {
        const totalActivation = (myCardStats.records ?? []).reduce((s: number, r: any) => s + (r.activation_count ?? 0), 0)
        const totalCancel     = (myCardStats.records ?? []).reduce((s: number, r: any) => s + (r.cancel_count ?? 0), 0)
        const hkr = calcHKR(totalActivation, totalCancel)
        return (
          <div className="mb-6 flex justify-center">
            <AccountCard
              user={myCard}
              hkr={hkr}
              totalActivation={totalActivation}
              totalCancel={totalCancel}
              loginCount={myCard.loginCount}
              entryDays={myCardStats.activity?.entry_days ?? 0}
              mtgAbsent={myCardStats.mtg?.absent_count ?? 0}
              strengths={[]}
              improvements={[]}
              compact
            />
          </div>
        )
      })()}

      <div className="mb-6 bg-gradient-to-r from-gray-700 to-gray-600 rounded-2xl px-6 py-5 shadow-md text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Settings</p>
        <h1 className="text-2xl font-bold">アカウント設定</h1>
        <p className="text-sm text-gray-300 mt-0.5">名前・メールアドレス・パスワードを変更できます</p>
      </div>

      {isTempLogin && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <ShieldAlert size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">仮パスワードでログインしています</p>
            <p className="text-xs text-amber-600 mt-0.5">セキュリティのため、今すぐパスワードを変更してください。</p>
          </div>
        </div>
      )}

      {/* アバター */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">プロフィール写真</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <UserAvatar name={name || '?'} avatar={avatar} size="xl" />
            {avatarLoading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Camera size={15} />写真を変更
            </button>
            {avatar && (
              <button
                onClick={handleDeleteAvatar}
                disabled={avatarLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <Trash2 size={15} />削除
              </button>
            )}
            <p className="text-xs text-gray-400">JPG・PNG・最大400KB</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* プロフィール変更 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">プロフィール</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {profileError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{profileError}</p>
          )}
          {profileSuccess && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              <CheckCircle size={16} /><span className="text-sm font-medium">変更しました</span>
            </div>
          )}

          <button
            type="submit" disabled={profileLoading}
            className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {profileLoading ? '保存中...' : '変更を保存する'}
          </button>
        </form>
      </div>

      {/* パスワード変更 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">パスワード変更</h2>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isTempLogin ? '仮パスワード' : '現在のパスワード'}
            </label>
            <input
              type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              required placeholder="••••••••"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード</label>
            <input
              type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              required minLength={6} placeholder="6文字以上"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード（確認）</label>
            <input
              type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              required placeholder="もう一度入力"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {passwordError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{passwordError}</p>
          )}
          {passwordSuccess && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              <CheckCircle size={16} /><span className="text-sm font-medium">パスワードを変更しました</span>
            </div>
          )}

          <button
            type="submit" disabled={passwordLoading}
            className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {passwordLoading ? '変更中...' : 'パスワードを変更する'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}
