'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { TAB_ROUTE } from '@/lib/siteRoutes'

const navLinks = [
  { href: TAB_ROUTE.build, label: 'Build 3D' },
  { href: TAB_ROUTE.edit, label: 'Edit Home' },
  { href: TAB_ROUTE.visit, label: 'Visit Home' },
] as const

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0c0a09] text-stone-100">
      {/* Ambient layers */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 55% at 50% -15%, rgba(251,191,36,0.22), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 40%, rgba(120,113,108,0.25), transparent 50%), radial-gradient(ellipse 50% 35% at 0% 80%, rgba(68,64,60,0.35), transparent 50%)',
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2048%2048%22%3E%3Cg%20fill=%22none%22%20stroke=%22%23ffffff%22%20stroke-opacity=%220.03%22%3E%3Cpath%20d=%22M0%20.5h48M0%2012.5h48M0%2024.5h48M0%2036.5h48M.5%200v48M12.5%200v48M24.5%200v48M36.5%200v48%22/%3E%3C/g%3E%3C/svg%3E')] opacity-90" />

      <header
        className={
          'fixed top-0 left-0 right-0 z-50 transition-[background,backdrop-filter,box-shadow,border-color] duration-500 ' +
          (scrolled
            ? 'border-b border-stone-700/60 bg-stone-950/75 shadow-lg shadow-black/20 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent')
        }
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="font-serif text-xl tracking-tight text-white transition hover:text-amber-100/95"
          >
            VividHome
          </Link>
          <nav
            className="flex flex-1 items-center justify-center gap-1 sm:justify-end sm:gap-2"
            aria-label="Primary"
          >
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-stone-300 transition hover:bg-white/5 hover:text-white sm:px-4"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href={TAB_ROUTE.build}
            className="hidden shrink-0 rounded-full bg-amber-500/95 px-4 py-2 text-sm font-semibold text-stone-950 shadow-lg shadow-amber-900/30 transition hover:bg-amber-400 sm:inline-flex"
          >
            Open studio
          </Link>
        </div>
      </header>

      <section className="relative min-h-[100dvh] pt-16">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1920&q=85"
            alt="Architectural interior with warm light"
            fill
            className="object-cover object-[center_35%] opacity-55"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/90 via-stone-950/65 to-[#0c0a09]" />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-transparent to-stone-950/50" />
        </div>

        <div className="relative mx-auto flex max-w-6xl flex-col justify-center px-4 pb-24 pt-20 sm:min-h-[calc(100dvh-4rem)] sm:px-6 sm:pb-32 sm:pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-200/90">
            Photoreal · First-person · Meshy-powered
          </p>
          <h1 className="mt-6 max-w-[14ch] font-serif text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-[1.08] tracking-tight text-white">
            Interiors you design—and then walk through.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-300 sm:text-lg">
            Generate furniture with AI, fine-tune lighting and layout like a pro, then explore your
            space with calibrated sun, soft shadows, and realistic materials.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href={TAB_ROUTE.build}
              className="inline-flex items-center justify-center rounded-full bg-amber-500 px-7 py-3.5 text-base font-semibold text-stone-950 shadow-xl shadow-amber-950/40 transition hover:bg-amber-400"
            >
              Start with Build 3D
            </Link>
            <Link
              href={TAB_ROUTE.visit}
              className="inline-flex items-center justify-center rounded-full border border-stone-500/60 bg-stone-950/40 px-7 py-3.5 text-base font-medium text-stone-100 backdrop-blur-sm transition hover:border-stone-400 hover:bg-stone-900/60"
            >
              Walk the demo home
            </Link>
          </div>
          <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-10 sm:mt-20 sm:gap-10">
            {[
              { k: 'Scale', v: '1 unit ≈ 1 m' },
              { k: 'Workflow', v: 'Generate → Edit → Visit' },
              { k: 'Feel', v: 'HDR & soft shadows' },
            ].map((row) => (
              <div key={row.k}>
                <dt className="text-xs font-medium uppercase tracking-wider text-stone-500">
                  {row.k}
                </dt>
                <dd className="mt-1.5 font-serif text-lg text-stone-100 sm:text-xl">{row.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="relative border-t border-stone-800/80 bg-stone-950 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-serif text-3xl tracking-tight text-white sm:text-4xl">
              Three modes. One coherent studio.
            </h2>
            <p className="mt-4 text-stone-400">
              Each workspace opens on its own route—bookmark, share, and return exactly where you
              left off.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            <Link
              href={TAB_ROUTE.build}
              className="group relative overflow-hidden rounded-2xl border border-stone-700/60 bg-stone-900/40 p-8 shadow-xl transition hover:border-amber-500/40 hover:bg-stone-900/70"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl transition group-hover:bg-amber-400/20" />
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-400/90">
                01
              </span>
              <h3 className="mt-4 font-serif text-2xl text-white">Build 3D</h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                Prompt Meshy, watch assets land in your library, and place models with sensible scale.
              </p>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-amber-400 transition group-hover:gap-3">
                Open /build-3d
                <span aria-hidden>→</span>
              </span>
            </Link>

            <Link
              href={TAB_ROUTE.edit}
              className="group relative overflow-hidden rounded-2xl border border-stone-700/60 bg-stone-900/40 p-8 shadow-xl transition hover:border-emerald-500/35 hover:bg-stone-900/70"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl transition group-hover:bg-emerald-400/15" />
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400/90">
                02
              </span>
              <h3 className="mt-4 font-serif text-2xl text-white">Edit Home</h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                Move furniture, tune lights, and hang pictures while the room stays physically
                grounded.
              </p>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition group-hover:gap-3">
                Open /edit-home
                <span aria-hidden>→</span>
              </span>
            </Link>

            <Link
              href={TAB_ROUTE.visit}
              className="group relative overflow-hidden rounded-2xl border border-stone-700/60 bg-stone-900/40 p-8 shadow-xl transition hover:border-sky-500/35 hover:bg-stone-900/70"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl transition group-hover:bg-sky-400/15" />
              <span className="text-xs font-semibold uppercase tracking-widest text-sky-400/90">
                03
              </span>
              <h3 className="mt-4 font-serif text-2xl text-white">Visit Home</h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                Walk in first person or orbit—the same lighting you edited, rendered in real time.
              </p>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-sky-400 transition group-hover:gap-3">
                Open /visit-home
                <span aria-hidden>→</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-800/80 bg-[#080706] py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="font-serif text-2xl text-stone-200 sm:text-3xl">
            Ready when you are.
          </p>
          <p className="mx-auto mt-3 max-w-lg text-stone-500">
            Pick a mode above or jump straight into generation.
          </p>
          <Link
            href={TAB_ROUTE.build}
            className="mt-10 inline-flex rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-stone-950 transition hover:bg-stone-200"
          >
            Enter VividHome
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-800/80 bg-stone-950 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-stone-500 sm:flex-row sm:px-6">
          <span className="font-serif text-stone-400">VividHome</span>
          <span>Desktop-first interior visualization</span>
        </div>
      </footer>
    </div>
  )
}
