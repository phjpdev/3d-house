'use client'

import { useRef } from 'react'
import { VividHomeExperience } from '@/components/canvas/VividHomeExperience'
import { useVividHomeStore } from '@/store/vividHomeStore'

export function EditTab() {
  const library = useVividHomeStore((s) => s.library)
  const wallPictures = useVividHomeStore((s) => s.wallPictures)
  const placeLibraryAtCenter = useVividHomeStore((s) => s.placeLibraryAtCenter)
  const addWallPicture = useVividHomeStore((s) => s.addWallPicture)
  const removeWallPicture = useVividHomeStore((s) => s.removeWallPicture)
  const removePlaced = useVividHomeStore((s) => s.removePlaced)
  const selectedId = useVividHomeStore((s) => s.selectedPlacedId)
  const fileRef = useRef<HTMLInputElement>(null)

  const onWallUpload = (f: File | null) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!dataUrl) return
      addWallPicture({
        id: crypto.randomUUID(),
        imageUrl: dataUrl,
        position: [-1.6, 1.48, -3.74],
        rotationY: 0,
        width: 0.72,
        height: 0.56,
      })
    }
    reader.readAsDataURL(f)
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-stone-200 bg-stone-50/90 p-4 lg:w-80 lg:border-r">
        <h2 className="font-serif text-lg text-stone-900">Library</h2>
        <p className="mt-1 text-xs text-stone-600">
          Place saved Meshy models. Select in scene for translate controls.
        </p>
        <ul className="mt-4 space-y-2">
          {library.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => placeLibraryAtCenter(m.id)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-left text-sm text-stone-800 hover:bg-stone-50"
              >
                {m.name}
              </button>
            </li>
          ))}
          {library.length === 0 ? (
            <li className="text-xs text-stone-500">Generate models in Build tab first.</li>
          ) : null}
        </ul>

        <div className="mt-8 border-t border-stone-200 pt-6">
          <h3 className="font-serif text-base text-stone-900">Wall art</h3>
          <p className="mt-1 text-xs text-stone-600">
            Upload — framed pieces merge into the scene (Transform on furniture only for MVP).
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onWallUpload(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
          >
            Add picture to wall
          </button>
          <ul className="mt-3 space-y-1 text-xs text-stone-600">
            {wallPictures.map((w) => (
              <li key={w.id} className="flex justify-between gap-2">
                <span className="truncate">{w.id.slice(0, 8)}…</span>
                <button
                  type="button"
                  className="text-red-700 hover:underline"
                  onClick={() => removeWallPicture(w.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 border-t border-stone-200 pt-6">
          <h3 className="font-serif text-base text-stone-900">Selection</h3>
          <p className="mt-1 text-xs text-stone-600">
            Selected: {selectedId ?? 'none'} — click empty space to clear.
          </p>
          {selectedId ? (
            <button
              type="button"
              className="mt-2 text-xs text-red-700 hover:underline"
              onClick={() => removePlaced(selectedId)}
            >
              Delete selected furniture
            </button>
          ) : null}
        </div>
      </aside>
      <div className="relative min-h-[560px] flex-1 bg-stone-900/5">
        <VividHomeExperience mode="edit" />
      </div>
    </div>
  )
}
