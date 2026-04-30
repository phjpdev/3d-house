'use client'

import { useEffect } from 'react'
import { BuildTab } from '@/components/build/BuildTab'
import { EditTab } from '@/components/edit/EditTab'
import { VisitTab } from '@/components/visit/VisitTab'
import { Navbar } from '@/components/site/Navbar'
import { useVividHomeStore, type AppTab } from '@/store/vividHomeStore'

export function WorkspaceShell({ tab }: { tab: AppTab }) {
  const setTab = useVividHomeStore((s) => s.setTab)

  useEffect(() => {
    setTab(tab)
  }, [tab, setTab])

  return (
    <div className="min-h-screen bg-stone-100 pt-16 text-stone-900">
      <Navbar />
      <main className="relative">
        {tab === 'build' ? <BuildTab /> : null}
        {tab === 'edit' ? <EditTab /> : null}
        {tab === 'visit' ? <VisitTab /> : null}
      </main>
    </div>
  )
}
