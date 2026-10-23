'use client'

import { useState, useEffect, useCallback } from 'react'
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { Fingerprint, ScanFace, Trash2, CheckCircle } from 'lucide-react'
import { useConfirm } from '@/components/useConfirm'

type Credential = { id: string; device_name: string; created_at: string; last_used_at: string }

// 設定画面：この端末の指紋・顔認証（パスキー）を登録／削除する
export default function BiometricSettings() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [supported, setSupported] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const load = useCallback(() => {
    fetch('/api/auth/webauthn/credentials')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setCredentials(Array.isArray(rows) ? rows : []))
  }, [])

  useEffect(() => {
    setSupported(browserSupportsWebAuthn())
    load()
  }, [load])

  async function handleRegister() {
    setError('')
    setLoading(true)
    try {
      const options = await fetch('/api/auth/webauthn/register/options', { method: 'POST' }).then((r) => r.json())
      if (options.error) throw new Error(options.error)
      const attestation = await startRegistration({ optionsJSON: options })
      const res = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attestation),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      load()
    } catch (e) {
      const err = e as Error
      if (err.name === 'InvalidStateError') setError('この端末はすでに登録されています')
      else if (err.name === 'NotAllowedError') setError('登録がキャンセルされました')
      else setError(err.message || '生体認証の登録に失敗しました')
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!await confirm('この端末の生体認証を削除しますか？')) return
    await fetch(`/api/auth/webauthn/credentials?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
      {ConfirmDialog}
      <div className="flex items-center gap-2 mb-1">
        <Fingerprint size={18} className="text-blue-600" />
        <ScanFace size={18} className="text-blue-600" />
        <h2 className="text-base font-semibold text-gray-900">指紋・顔認証ログイン</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        この端末を登録すると、次回からログイン画面の「指紋でログイン」「顔認証でログイン」でパスワードなしでログインできます。
        端末ごとに登録してください。
      </p>

      {!supported ? (
        <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">このブラウザは生体認証に対応していません</p>
      ) : (
        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '登録中...' : 'この端末を登録する'}
        </button>
      )}

      {error && <p className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {success && (
        <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
          <CheckCircle size={16} /><span className="text-sm font-medium">登録しました</span>
        </div>
      )}

      {credentials.length > 0 && (
        <ul className="mt-4 divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {credentials.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-800">{c.device_name || '端末'}</p>
                <p className="text-xs text-gray-400">
                  登録 {c.created_at.slice(0, 10)}{c.last_used_at ? ` ・ 最終利用 ${c.last_used_at.slice(0, 10)}` : ''}
                </p>
              </div>
              <button onClick={() => handleDelete(c.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1" aria-label="削除">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
