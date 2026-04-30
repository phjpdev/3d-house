'use client'

import { VividHomeExperience } from '@/components/canvas/VividHomeExperience'
import { useVividHomeStore } from '@/store/vividHomeStore'

export function VisitTab() {
  const visitUseOrbit = useVividHomeStore((s) => s.visitUseOrbit)
  const setVisitUseOrbit = useVividHomeStore((s) => s.setVisitUseOrbit)

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-sm rounded-xl bg-white/90 p-4 text-sm text-stone-800 shadow-lg backdrop-blur">
        <p className="font-serif text-base text-stone-900">Walking mode</p>
        <p className="mt-2 text-stone-600">
          Click the scene to capture the pointer. <kbd className="rounded bg-stone-200 px-1">WASD</kbd>{' '}
          to move, mouse to look. Press <kbd className="rounded bg-stone-200 px-1">Esc</kbd> to release
          the pointer.
        </p>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-stone-700">
          <input
            type="checkbox"
            checked={visitUseOrbit}
            onChange={(e) => setVisitUseOrbit(e.target.checked)}
          />
          Use orbit camera instead of walk
        </label>
      </div>
      <VividHomeExperience mode="visit" />
    </div>
  )
}
