'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Navbar } from '@/components/site/Navbar'
import { warmStudioNavigation } from '@/lib/warmStudioNavigation'
import { useVividHomeStore, type AppTab } from '@/store/vividHomeStore'

function pathnameToTab(p: string): AppTab {
  if (p.startsWith('/visit-home')) return 'visit'
  if (p.startsWith('/edit-home')) return 'edit'
  return 'build'
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const setTab = useVividHomeStore((s) => s.setTab)

  useEffect(() => {
    setTab(pathnameToTab(pathname))
  }, [pathname, setTab])

  useEffect(() => {
    warmStudioNavigation(router)
  }, [router])

  return (
    <div className="min-h-screen bg-stone-100 pt-16 text-stone-900">
      <Navbar />
      <main className="relative min-w-0 overflow-x-hidden">{children}</main>
    </div>
  )
}
