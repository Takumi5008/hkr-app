'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, PenLine, TrendingUp, Users, Settings, LogOut, Menu, X, Calendar, ClipboardList, CheckSquare, CalendarDays, BarChart2, StickyNote, Award, Table2, Zap, Bell, BellOff, Trophy, BookOpen, Gamepad2, GraduationCap, FileText, Network, Activity } from 'lucide-react'
import WifiAppIcon from '@/components/WifiAppIcon'
import { useState, useEffect, useRef } from 'react'
import UserAvatar from '@/components/UserAvatar'
import ActivationBadge from '@/components/ActivationBadge'

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/challenge', label: 'チャレンジ', icon: Trophy },
  { href: '/sugoroku', label: '開通双六', icon: Gamepad2 },
  { href: '/input', label: 'HKR入力', icon: PenLine },
  { href: '/progress', label: '個人進捗', icon: BarChart2 },
  { href: '/status', label: '個人ステータス', icon: Activity },
  { href: '/activity', label: '行動表', icon: Table2 },
  { href: '/activation', label: '開通表', icon: Zap },
  { href: '/trends', label: 'マイ推移', icon: TrendingUp },
  { href: '/attendance', label: '出欠管理', icon: Calendar },
  { href: '/tasks', label: 'タスク管理', icon: CheckSquare },
  { href: '/schedule', label: 'スケジュール', icon: CalendarDays },
  { href: '/memo', label: 'メモ', icon: StickyNote },
  { href: '/knowledge', label: '知識向上', icon: GraduationCap },
  { href: '/review', label: '月次振り返り', icon: FileText },
  { href: '/org', label: '組織図', icon: Network },
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

const NAV_ORDER_KEY = 'nav_order'

export default function Sidebar({ name, role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [navOrder, setNavOrder] = useState<string[]>(() => navItems.map((i) => i.href))
  const dragRef = useRef<string | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAV_ORDER_KEY)
      if (saved) {
        const parsed: string[] = JSON.parse(saved)
        const allHrefs = navItems.map((i) => i.href)
        const merged = [
          ...parsed.filter((h) => allHrefs.includes(h)),
          ...allHrefs.filter((h) => !parsed.includes(h)),
        ]
        setNavOrder(merged)
      }
    } catch {}
  }, [])

  const saveOrder = (order: string[]) => {
    setNavOrder(order)
    try { localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(order)) } catch {}
  }

  const moveItem = (href: string, dir: -1 | 1) => {
    setNavOrder((prev) => {
      const idx = prev.indexOf(href)
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      try { localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const orderedNavItems = navOrder
    .map((h) => navItems.find((i) => i.href === h))
    .filter(Boolean) as typeof navItems

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const isManager = role === 'manager' || role === 'viewer' || role === 'admin'
  const isShiftViewer = role === 'shift_viewer'
  const roleLabel = role === 'manager' ? 'マネージャー' : role === 'viewer' ? '閲覧者' : role === 'shift_viewer' ? 'シフト管理者' : role === 'admin' ? 'アプリ管理者' : 'メンバー'

  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [myStreak, setMyStreak] = useState<number>(0)
  const [myAvatar, setMyAvatar] = useState<string | null>(null)
  const [myMonthlyOpening, setMyMonthlyOpening] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.loginStreak === 'number') setMyStreak(d.loginStreak)
        if (d.avatar) setMyAvatar(d.avatar)
        if (typeof d.monthlyOpening === 'number') setMyMonthlyOpening(d.monthlyOpening)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (role !== 'manager' && role !== 'admin') return
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
        {orderedNavItems.map(({ href, label, icon: Icon }, idx) => (
          <div
            key={href}
            draggable={editMode}
            onDragStart={() => { dragRef.current = href }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (!dragRef.current || dragRef.current === href) return
              const from = navOrder.indexOf(dragRef.current)
              const to = navOrder.indexOf(href)
              const next = [...navOrder]
              next.splice(from, 1)
              next.splice(to, 0, dragRef.current)
              saveOrder(next)
              dragRef.current = null
            }}
            className={`flex items-center gap-1 rounded-lg ${editMode ? 'cursor-grab bg-white/5' : ''}`}
          >
            {editMode && (
              <div className="flex flex-col pl-1">
                <button
                  type="button"
                  onClick={() => moveItem(href, -1)}
                  disabled={idx === 0}
                  className="text-indigo-400 hover:text-white disabled:opacity-20 leading-none py-0.5"
                >▲</button>
                <button
                  type="button"
                  onClick={() => moveItem(href, 1)}
                  disabled={idx === orderedNavItems.length - 1}
                  className="text-indigo-400 hover:text-white disabled:opacity-20 leading-none py-0.5"
                >▼</button>
              </div>
            )}
            {editMode ? (
              <span className="flex items-center gap-3 flex-1 px-2 py-2.5 text-sm font-medium text-indigo-300">
                <Icon size={17} />
                {label}
              </span>
            ) : (
              <Link
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  pathname === href
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-indigo-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={17} className={pathname === href ? 'text-blue-300' : ''} />
                {label}
              </Link>
            )}
          </div>
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
              {myMonthlyOpening !== null && <ActivationBadge cumulative={myMonthlyOpening} size="xs" />}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-indigo-400">{roleLabel}</p>
              {myStreak > 0 && (
                <span className="text-[10px] font-bold text-orange-300 bg-orange-400/20 px-1.5 py-0.5 rounded-full shrink-0">
                  🔥 {myStreak}日
                </span>
              )}
            </div>
          </div>
        </Link>

        {(role === 'manager' || role === 'admin') && (
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
        {/* 背景オーブ */}
        <div className="animate-orb-1 absolute top-[-60px] left-[-60px] w-48 h-48 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
        <div className="animate-orb-3 absolute bottom-[80px] right-[-40px] w-40 h-40 rounded-full bg-violet-500/15 blur-2xl pointer-events-none" />
        <div className="animate-orb-2 absolute top-[45%] left-[-30px] w-32 h-32 rounded-full bg-indigo-400/10 blur-xl pointer-events-none" />

        <div className="sidebar-pc-top relative z-10 px-6 py-5 border-b border-indigo-800/60">
          <div className="flex items-center gap-3">
            <WifiAppIcon size={32} />
            <div className="flex-1">
              <h1 className="text-base font-bold text-white">インフラ管理</h1>
            </div>
            <button
              onClick={() => setEditMode((v) => !v)}
              title={editMode ? '完了' : 'メニューを並び替え'}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${editMode ? 'bg-blue-500 text-white' : 'text-indigo-400 hover:text-white hover:bg-white/10'}`}
            >
              {editMode ? '完了' : '⇅'}
            </button>
          </div>
        </div>
        <div className="relative z-10 flex flex-col flex-1 min-h-0">
          <NavContent />
        </div>
      </aside>

      {/* スマホ トップバー */}
      <header className="sm:hidden fixed top-0 left-0 right-0 z-20 bg-gradient-to-r from-indigo-950 via-indigo-900 to-blue-950 shadow-lg overflow-hidden">
        <div className="mobile-header-inner flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <WifiAppIcon size={28} />
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
            <div className="animate-orb-1 absolute top-[-40px] left-[-40px] w-40 h-40 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
            <div className="animate-orb-3 absolute bottom-[60px] right-[-30px] w-36 h-36 rounded-full bg-violet-500/15 blur-2xl pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-indigo-800/60">
              <div className="flex items-center gap-3">
                <WifiAppIcon size={32} />
                <div>
                  <h1 className="text-base font-bold text-white">インフラ管理</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditMode((v) => !v)}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${editMode ? 'bg-blue-500 text-white' : 'text-indigo-400 hover:text-white'}`}
                >
                  {editMode ? '完了' : '⇅'}
                </button>
                <button onClick={() => setMobileOpen(false)} className="text-indigo-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
            </div>
            <NavContent />
          </div>
        </div>
      )}

    </>
  )
}
