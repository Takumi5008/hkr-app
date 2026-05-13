'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-800 to-blue-700">
      {/* 浮遊オーブ */}
      <div className="animate-orb-1 absolute top-[-10%] left-[-5%] w-[480px] h-[480px] rounded-full bg-blue-500/25 blur-3xl pointer-events-none" />
      <div className="animate-orb-2 absolute bottom-[-15%] right-[-10%] w-[520px] h-[520px] rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
      <div className="animate-orb-3 absolute top-[40%] right-[10%] w-[320px] h-[320px] rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />
      <div className="animate-orb-4 absolute bottom-[20%] left-[5%] w-[280px] h-[280px] rounded-full bg-sky-400/15 blur-2xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur mb-4 shadow-lg ring-1 ring-white/30">
            <span className="text-lg font-black text-white">IP</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">インフラ管理</h1>
          <p className="text-sm text-indigo-300 mt-1">チームの成果を、一画面で。</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 ring-1 ring-white/20">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <div className="mt-5 space-y-2 text-center">
            <div>
              <Link href="/register" className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline font-medium">
                新規登録はこちら
              </Link>
            </div>
            <div>
              <Link href="/forgot-password" className="text-sm text-gray-400 hover:text-gray-600 hover:underline">
                パスワードをお忘れの方
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

