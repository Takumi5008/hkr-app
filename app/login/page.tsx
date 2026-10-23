'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Lock, Eye, EyeOff, ArrowRight, ChevronRight, Fingerprint, ScanFace } from 'lucide-react'
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { signalMarkSvg } from '@/lib/brandIcon'

const SIGNAL_MARK_SRC = `data:image/svg+xml,${encodeURIComponent(signalMarkSvg())}`

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)
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

  // 指紋・顔認証（パスキー）ログイン。指紋／顔のどちらが使われるかは端末側が決める
  async function handleBiometricLogin() {
    setError('')
    if (!browserSupportsWebAuthn()) {
      setError('このブラウザは生体認証に対応していません')
      return
    }
    setBioLoading(true)
    try {
      const options = await fetch('/api/auth/webauthn/login/options', { method: 'POST' }).then((r) => r.json())
      const assertion = await startAuthentication({ optionsJSON: options })
      const res = await fetch('/api/auth/webauthn/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assertion),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/dashboard')
      router.refresh()
    } catch (e) {
      const err = e as Error
      setError(err.name === 'NotAllowedError'
        ? '生体認証がキャンセルされました。未登録の場合はパスワードでログイン後、アカウント設定で登録してください'
        : err.message || '生体認証でログインできませんでした')
      setBioLoading(false)
    }
  }

  const inputStyle = {
    backgroundColor: 'rgba(8,16,34,0.7)',
    border: '1px solid rgba(148,163,184,0.25)',
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050b1a]">
      {/* PC幅の左右余白：ヒーロー画像をぼかして敷く */}
      <div
        className="absolute inset-0 pointer-events-none bg-cover bg-center opacity-50 scale-110"
        style={{ backgroundImage: 'url(/login-bg-blur.webp)', filter: 'blur(40px)' }}
      />

      <div className="relative mx-auto w-full max-w-[480px] min-h-screen bg-[#050b1a] shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* ヒーロー（都市とキャッチコピー） */}
        <div className="relative" style={{ containerType: 'inline-size' }}>
          <Image
            src="/login-hero-v2.webp"
            alt="つなぐ。広げる。つくる。Wi-Fiの力で、人と暮らしの可能性を広げる。"
            width={887}
            height={730}
            priority
            className="block w-full h-auto"
          />
          {/* ロゴ（ブランドアイコン「シグナル」＋ Dot.A / IP事業部）。サイズは画像幅に追従 */}
          <div className="absolute flex items-center" style={{ left: '6.5%', top: '4.5%', gap: '2.2cqw' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SIGNAL_MARK_SRC} alt="" aria-hidden style={{ width: '10cqw', height: 'auto' }} />
            <div className="leading-none">
              <p className="font-bold text-white tracking-wide" style={{ fontSize: 'clamp(18px, 5.6cqw, 30px)' }}>Dot.A</p>
              <p className="text-slate-300 font-medium tracking-[0.18em] mt-[0.35em]" style={{ fontSize: 'clamp(10.5px, 2.6cqw, 15px)' }}>IP事業部</p>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-[#050b1a] pointer-events-none" />
        </div>

        {/* カード背後の光の筋 */}
        <div
          className="absolute right-[-30%] bottom-[-10%] w-[90%] h-[70%] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 70% 40%, rgba(37,99,235,0.35), transparent 60%)' }}
        />

        {/* ログインカード */}
        <div className="relative -mt-3 mx-4 sm:mx-6 pb-8">
          <div
            className="relative overflow-hidden rounded-[28px] px-6 sm:px-8 pt-8 pb-7"
            style={{
              background: 'linear-gradient(160deg, rgba(15,30,60,0.85) 0%, rgba(6,12,28,0.92) 60%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(96,165,250,0.35)',
              boxShadow: '0 24px 70px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* カード内のハイライト */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 60% 40% at 75% 0%, rgba(96,165,250,0.18), transparent 70%)' }} />

            <div className="relative">
              <h1 className="text-[28px] font-bold text-white tracking-wide">ログイン</h1>
              <p className="text-sm text-slate-300 mt-1">アカウント情報を入力してください</p>

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div className="relative">
                  <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    aria-label="メールアドレス"
                    placeholder="メールアドレス"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/70 transition-all"
                    style={inputStyle}
                  />
                </div>

                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    aria-label="パスワード"
                    placeholder="パスワード"
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/70 transition-all"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-white transition-colors"
                  >
                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-xl text-sm text-red-300"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full py-3.5 px-5 mt-2 text-white text-base font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(90deg, #0ea5e9 0%, #2563eb 100%)',
                    boxShadow: '0 8px 30px rgba(14,165,233,0.45)',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ログイン中...
                    </span>
                  ) : (
                    <>
                      <span>ログイン</span>
                      <ArrowRight size={22} className="absolute right-5 top-1/2 -translate-y-1/2" />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center gap-4 my-6">
                <div className="h-px flex-1 bg-slate-600/50" />
                <span className="text-xs text-slate-400">または</span>
                <div className="h-px flex-1 bg-slate-600/50" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: '指紋でログイン', Icon: Fingerprint },
                  { label: '顔認証でログイン', Icon: ScanFace },
                ] as const).map(({ label, Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={bioLoading || loading}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: 'rgba(8,16,34,0.6)', border: '1px solid rgba(148,163,184,0.25)' }}
                  >
                    <Icon size={34} strokeWidth={1.6} className="text-sky-400" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500 text-center">
                初回はログイン後、アカウント設定で端末を登録
              </p>

              <div className="mt-5 flex flex-col items-center gap-3 text-center">
                <Link href="/register" className="text-sm text-slate-300 hover:text-white transition-colors">
                  新規登録はこちら
                </Link>
                <Link href="/forgot-password"
                  className="inline-flex items-center gap-1 text-sm text-sky-400 underline underline-offset-4 hover:text-sky-300 transition-colors">
                  パスワードをお忘れの方
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
