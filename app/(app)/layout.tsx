import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { dbQueryOne } from '@/lib/db'
import Sidebar from '@/components/Sidebar'
import NotificationBanner from '@/components/NotificationBanner'
import VirtualKeyboardFix from '@/components/VirtualKeyboardFix'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.userId) redirect('/login')

  // Sync role from DB so admin-granted role changes show immediately
  const userRow = await dbQueryOne<{ role: string }>('SELECT role FROM users WHERE id = $1', [session.userId])
  const dbRole = userRow?.role as typeof session.role | undefined
  const role = dbRole ?? session.role
  if (dbRole && dbRole !== session.role) {
    session.role = dbRole
    await session.save()
  }

  return (
    <div className="flex h-full">
      <Sidebar name={session.name} role={role} />
      <NotificationBanner />
      <VirtualKeyboardFix />
      <ServiceWorkerRegister />
      {/* PC: サイドバー分マージン / スマホ: トップバー+ボトムナビ分パディング */}
      <main className="sm:ml-60 flex-1 min-h-screen main-content-mobile">{children}</main>
    </div>
  )
}
