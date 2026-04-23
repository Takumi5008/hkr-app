'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, PenLine, TrendingUp, Users, Settings, LogOut, Menu, X, Calendar, ClipboardList } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/input', label: 'HKR入力', icon: PenLine },
  { href: '/trends', label: 'マイ推移', icon: TrendingUp },
  { href: '/shift', label: 'シフト入力', icon: Calendar },
  { href: '/mtg', label: 'MTG出欠', icon: ClipboardList },
]

const managerNavItems = [
  { href: '/team', label: 'チーム全体', icon: Users },
  { href: '/admin', label: '管理', icon: Settings },
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
  const roleLabel = role === 'manager' ? 'マネージャー' : role === 'viewer' ? '閲覧者' : 'メンバー'

  // ボトムナビは共通4項目のみ（管理者専用メニューはハンバーガーから）
  const bottomNavItems = [
    { href: '/dashboard', label: 'ホーム', icon: LayoutDashboard },
    { href: '/input', label: 'HKR', icon: PenLine },
    { href: '/shift', label: 'シフト', icon: Calendar },
    { href: '/mtg', label: 'MTG', icon: ClipboardList },
    { href: '/settings', label: '設定', icon: Settings },
  ]

  const NavContent = () => (
    <>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
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
      </nav>

      <div className="px-3 py-4 border-t border-indigo-800/60 space-y-0.5">
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
            pathname === '/settings' ? 'bg-white/15' : 'hover:bg-white/10'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow">
            {name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{name}</p>
            <p className="text-xs text-indigo-400">{roleLabel}</p>
          </div>
        </Link>

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
      <aside className="hidden sm:flex w-60 bg-gradient-to-b from-indigo-950 to-indigo-900 flex-col h-full fixed left-0 top-0 z-10 shadow-xl">
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
          <div className="relative w-72 bg-gradient-to-b from-indigo-950 to-indigo-900 h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-800/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center shadow">
                  <span className="text-xs font-black text-white">IP</span>
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">インフラ管理</h1>
                  <p className="text-xs text-indigo-400">HKR・シフト管理</p>
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

      {/* スマホ ボトムナビ */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around px-2 py-1">
          {bottomNavItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
                pathname === href ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs font-medium">{label.length > 4 ? label.slice(0, 4) : label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
