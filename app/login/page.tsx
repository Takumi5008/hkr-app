'use client'

import { useState } from 'react'
import WifiAppIcon from '@/components/WifiAppIcon'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FireworksCanvas from '@/components/FireworksCanvas'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'ログインに失敗しました')
      setLoading(false)
      return
    }

    const data = await res.json()
    if (data.requirePasswordChange) {
      router.push('/settings?reason=temp')
    } else {
      router.push('/dashboard')
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-[#020817]">

      {/* 花火 */}
      <FireworksCanvas />

      {/* グリッドオーバーレイ */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }}
      />

      {/* オーロラオーブ群 */}
      <div className="animate-orb-1 absolute top-[-15%] left-[-8%]  w-[680px] h-[680px] rounded-full bg-violet-600/40  blur-[130px] pointer-events-none" />
      <div className="animate-orb-2 absolute bottom-[-20%] right-[-12%] w-[720px] h-[720px] rounded-full bg-blue-600/35   blur-[140px] pointer-events-none" />
      <div className="animate-orb-3 absolute top-[35%] right-[2%]   w-[420px] h-[420px] rounded-full bg-cyan-500/30   blur-[100px] pointer-events-none" />
      <div className="animate-orb-4 absolute bottom-[8%]  left-[3%]  w-[380px] h-[380px] rounded-full bg-indigo-500/35 blur-[90px]  pointer-events-none" />
      <div className="animate-orb-5 absolute top-[10%]  right-[20%] w-[300px] h-[300px] rounded-full bg-rose-500/20   blur-[80px]  pointer-events-none" />

      {/* 中央ビネット（中心だけ明るく） */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 30%, rgba(2,8,23,0.6) 100%)' }}
      />

      {/* コンテンツ */}
      <div className="relative z-10 w-full max-w-sm" style={{ zIndex: 10 }}>

        {/* ロゴ */}
        <div className="text-center mb-10">
          <div className="animate-logo-glow inline-flex mb-5">
            <WifiAppIcon size={72} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">インフラ管理</h1>
          <p className="text-sm text-white/40 mt-2 tracking-wide">チームの成果を、一画面で。</p>
        </div>

        {/* グラスカード */}
        <div
          className="relative overflow-hidden rounded-3xl p-8"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          {/* カード内シマー */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)' }} />

          <form onSubmit={handleLogin} className="relative space-y-5">
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/70 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/70 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm text-red-300"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative w-full py-3 px-4 text-white text-sm font-bold rounded-xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)',
                boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ログイン中...
                </span>
              ) : 'ログイン'}
            </button>
          </form>

          <div className="relative mt-6 space-y-2.5 text-center">
            <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <Link href="/register"
              className="block text-sm font-medium text-white/50 hover:text-white/80 transition-colors pt-1">
              新規登録はこちら
            </Link>
            <Link href="/forgot-password"
              className="block text-xs text-white/30 hover:text-white/50 transition-colors">
              パスワードをお忘れの方
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
