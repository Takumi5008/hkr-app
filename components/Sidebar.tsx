'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, PenLine, TrendingUp, Users, Settings, LogOut, Menu, X, Calendar, ClipboardList, CheckSquare, CalendarDays, BarChart2, StickyNote, Award, Table2, Zap, Bell, BellOff, Trophy, Gift, BookOpen, Swords } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getBadge } from '@/components/ActivationBadge'
import UserAvatar from '@/components/UserAvatar'

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/challenge', label: 'チャレンジ', icon: Trophy },
  { href: '/quests', label: 'ミッション', icon: Swords },
  { href: '/exchange', label: 'ポイント交換', icon: Gift },
  { href: '/input', label: 'HKR入力', icon: PenLine },
  { href: '/progress', label: '個人進捗', icon: BarChart2 },
  { href: '/activity', label: '行動表', icon: Table2 },
  { href: '/activation', label: '開通表', icon: Zap },
  { href: '/trends', label: 'マイ推移', icon: TrendingUp },
  { href: '/shift', label: 'シフト入力', icon: Calendar },
  { href: '/mtg', label: 'MTG出欠', icon: ClipboardList },
  { href: '/tasks', label: 'タスク管理', icon: CheckSquare },
  { href: '/schedule', label: 'スケジュール', icon: CalendarDays },
  { href: '/memo', label: 'メモ', icon: StickyNote },
  { href: '/howto', label: '使い方', icon: BookOpen },
]

const managerNavItems = [
  { href: '/team', label: 'チーム全体', icon: Users },
  { href: '/performance', label: '実績', icon: Award },
  { href: '/admin', label: '管理', icon: Settings },
]

const shiftViewerNavItems = [
  { href: '/admin', label: 'シフト管理', icon: Calendar },
]

interface SidebarProps {
  name: string
  role: string
}

export default function Sidebar({ name, role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const isManager = role === 'manager' || role === 'viewer'
  const isShiftViewer = role === 'shift_viewer'
  const roleLabel = role === 'manager' ? 'マネージャー' : role === 'viewer' ? '閲覧者' : role === 'shift_viewer' ? 'シフト管理者' : 'メンバー'

  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [myActivation, setMyActivation] = useState(0)
  const [myPoints, setMyPoints] = useState<number | null>(null)
  const [myLevel, setMyLevel] = useState<number>(0)
  const [myStreak, setMyStreak] = useState<number>(0)
  const [myAvatar, setMyAvatar] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    fetch(`/api/records?year=${y}&month=${m}`)
      .then((r) => r.json())
      .then((data: { activation_count: number }[]) => {
        if (Array.isArray(data)) setMyActivation(data.reduce((s, r) => s + (r.activation_count ?? 0), 0))
      })
      .catch(() => {})
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.points === 'number') setMyPoints(d.points)
        if (typeof d.level === 'number') setMyLevel(d.level)
        if (typeof d.loginStreak === 'number') setMyStreak(d.loginStreak)
        if (d.avatar) setMyAvatar(d.avatar)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (role !== 'manager') return
    fetch('/api/push/subscribe').then((r) => r.json()).then((d) => setPushSubscribed(d.subscribed ?? false)).catch(() => {})
  }, [role])

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
  }

  async function handlePushToggle() {
    if (pushLoading) return
    setPushLoading(true)
    try {
      if (pushSubscribed) {
        await fetch('/api/push/subscribe', { method: 'DELETE' })
        setPushSubscribed(false)
      } else {
        // iOSはPWA（ホーム画面追加）モードでないと通知が使えない
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
        if (!isStandalone) {
          alert('通知を使うには、Safariの共有ボタン →「ホーム画面に追加」してから、ホーム画面のアイコンで開いてください。')
          setPushLoading(false)
          return
        }
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          alert('このブラウザはプッシュ通知に対応していません')
          setPushLoading(false)
          return
        }
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          alert(`通知が許可されませんでした（状態: ${permission}）\n設定アプリ → Safari → 通知 から許可してください`)
          setPushLoading(false)
          return
        }
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) { alert('VAPID公開鍵が設定されていません'); setPushLoading(false); return }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub),
        })
        setPushSubscribed(true)
      }
    } catch (e: any) {
      alert(`エラー: ${e?.message ?? '不明なエラー'}`)
    }
    setPushLoading(false)
  }

  const NavContent = () => (
    <>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto min-h-0">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              pathname === href
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-indigo-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon size={17} className={pathname === href ? 'text-blue-300' : ''} />
            {label}
          </Link>
        ))}

        {isManager && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">管理者</p>
            </div>
            {managerNavItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  pathname === href
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-indigo-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={17} className={pathname === href ? 'text-blue-300' : ''} />
                {label}
              </Link>
            ))}
          </>
        )}

        {isShiftViewer && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">シフト</p>
            </div>
            {shiftViewerNavItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  pathname === href
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-indigo-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={17} className={pathname === href ? 'text-blue-300' : ''} />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-indigo-800/60 space-y-0.5">
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
            pathname === '/settings' ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          <UserAvatar name={name} avatar={myAvatar} size="md" className="shadow" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm font-medium text-white truncate">{name}</p>
              {(() => { const b = getBadge(myActivation); return b ? <span className="text-[10px] font-bold shrink-0 opacity-90">{b.emoji}</span> : null })()}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-indigo-400">{roleLabel}{(() => { const b = getBadge(myActivation); return b ? ` · ${b.label}` : '' })()}</p>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] font-bold text-violet-300 bg-violet-400/20 px-1.5 py-0.5 rounded-full shrink-0">
                  Lv.{myLevel}
                </span>
                {myStreak > 0 && (
                  <span className="text-[10px] font-bold text-orange-300 bg-orange-400/20 px-1.5 py-0.5 rounded-full shrink-0">
                    🔥 {myStreak}日
                  </span>
                )}
                {myPoints !== null && (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded-full shrink-0">
                    ⭐ {myPoints.toLocaleString()}pt
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {role === 'manager' && (
          <button
            onClick={handlePushToggle}
            disabled={pushLoading}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
              pushSubscribed ? 'text-amber-300 hover:bg-white/10' : 'text-indigo-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {pushSubscribed ? <Bell size={17} className="text-amber-300" /> : <BellOff size={17} />}
            {pushLoading ? '設定中...' : pushSubscribed ? '通知ON' : '通知を有効にする'}
          </button>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-300 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut size={17} />
          ログアウト
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* PC サイドバー */}
      <aside className="hidden sm:flex w-60 bg-gradient-to-b from-indigo-950 to-indigo-900 flex-col h-full fixed left-0 top-0 z-10 shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-indigo-800/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center shadow">
              <span className="text-xs font-black text-white">IP</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-white">インフラ管理</h1>
            </div>
          </div>
        </div>
        <NavContent />
      </aside>

      {/* スマホ トップバー */}
      <header className="sm:hidden fixed top-0 left-0 right-0 z-20 bg-gradient-to-r from-indigo-950 to-indigo-900 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center shadow">
              <span className="text-xs font-black text-white">IP</span>
            </div>
            <span className="text-base font-bold text-white">インフラ管理</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="text-indigo-300 hover:text-white transition-colors p-1"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* スマホ ドロワーメニュー */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-30 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 bg-gradient-to-b from-indigo-950 to-indigo-900 h-full flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-800/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center shadow">
                  <span className="text-xs font-black text-white">IP</span>
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">インフラ管理</h1>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-indigo-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <NavContent />
          </div>
        </div>
      )}

    </>
  )
}
