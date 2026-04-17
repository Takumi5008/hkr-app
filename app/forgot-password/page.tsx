'use client'

import { useState } from 'react'
import Link from 'next/link'
import { KeyRound, Copy, Check, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    setTempPassword(data.tempPassword)
    setLoading(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">HKR管理</h1>
          <p className="mt-2 text-sm text-gray-500">パスワードをお忘れの方</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {!tempPassword ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  登録済みのメールアドレスを入力すると、仮パスワードが発行されます。
                  仮パスワードの有効期限は<span className="font-medium">1時間</span>です。
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '発行中...' : '仮パスワードを発行する'}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto">
                <KeyRound size={24} className="text-green-600" />
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 mb-1">仮パスワードが発行されました</p>
                <p className="text-xs text-gray-400">有効期限: 1時間</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xl font-mono font-bold tracking-widest text-gray-900">
                    {tempPassword}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors shrink-0"
                  >
                    {copied ? <><Check size={13} className="text-green-500" />コピー済み</> : <><Copy size={13} />コピー</>}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-xs text-amber-700">
                  この仮パスワードでログイン後、すぐにパスワードを変更してください。
                </p>
              </div>

              <Link
                href="/login"
                className="block w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 text-center transition-colors"
              >
                ログインページへ
              </Link>
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link href="/login" className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={14} />
            ログインに戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
