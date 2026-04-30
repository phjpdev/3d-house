'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TAB_ROUTE } from '@/lib/siteRoutes'
import type { AppTab } from '@/store/vividHomeStore'

const tabs: { id: AppTab; label: string }[] = [
  { id: 'build', label: 'Build 3D Model' },
  { id: 'edit', label: 'Edit Home' },
  { id: 'visit', label: 'Visit Home' },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <header className="navbar-glass border-b border-stone-200/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="font-serif text-xl tracking-tight text-stone-800 transition hover:text-stone-950"
        >
          VividHome
        </Link>
        <nav className="flex flex-1 items-center justify-center" aria-label="Main">
          <div className="inline-flex rounded-full bg-stone-100/90 p-1 shadow-inner">
            {tabs.map((t) => {
              const href = TAB_ROUTE[t.id]
              const active = pathname === href
              return (
                <Link
                  key={t.id}
                  href={href}
                  className={
                    'rounded-full px-3 py-2 text-sm font-medium transition sm:px-5 ' +
                    (active
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-600 hover:text-stone-900')
                  }
                >
                  {t.label}
                </Link>
              )
            })}
          </div>
        </nav>
        <span className="hidden text-xs text-stone-500 sm:block">
          Desktop-first · 1 unit ≈ 1 m
        </span>
      </div>
    </header>
  )
}
