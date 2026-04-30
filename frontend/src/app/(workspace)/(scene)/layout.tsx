'use client'

import { usePathname } from 'next/navigation'
import { VividHomeExperience } from '@/components/canvas/VividHomeExperience'

/**
 * Keeps one WebGL canvas mounted across Edit ↔ Visit so tab switches stay instant
 * (no repeated dynamic chunk load or full scene re-init).
 */
export default function SceneLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const visit = pathname.startsWith('/visit-home')
  const mode = visit ? ('visit' as const) : ('edit' as const)

  return (
    <div
      className={
        visit
          ? 'relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-stone-200/30'
          : 'flex min-h-[calc(100vh-4rem)] flex-col lg:h-[calc(100vh-4rem)] lg:flex-row'
      }
    >
      {children}
      <div
        className={
          visit
            ? 'h-full w-full'
            : 'relative min-h-[320px] h-[58vh] w-full flex-1 bg-stone-900/5 lg:h-full lg:min-h-0'
        }
      >
        <VividHomeExperience mode={mode} />
      </div>
    </div>
  )
}
