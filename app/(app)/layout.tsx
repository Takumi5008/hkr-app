import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import Sidebar from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.userId) redirect('/login')

  return (
    <div className="flex h-full">
      <Sidebar name={session.name} role={session.role} />
      {/* PC: サイドバー分マージン / スマホ: トップバー+ボトムナビ分パディング */}
      <main className="sm:ml-60 flex-1 min-h-screen pt-14 pb-16 sm:pt-0 sm:pb-0">{children}</main>
    </div>
  )
}
