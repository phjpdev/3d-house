'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Navbar } from '@/components/site/Navbar'
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
    router.prefetch('/build-3d')
    router.prefetch('/edit-home')
    router.prefetch('/visit-home')
    // Warm the R3F scene chunk while user is on Build (or after first scene visit) so Edit opens faster.
    void import('@/components/canvas/VividHomeExperience')
  }, [router])

  return (
    <div className="min-h-screen bg-stone-100 pt-16 text-stone-900">
      <Navbar />
      <main className="relative min-w-0 overflow-x-hidden">{children}</main>
    </div>
  )
}
