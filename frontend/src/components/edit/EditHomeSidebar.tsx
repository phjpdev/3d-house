'use client'

import { useRef, useState } from 'react'
import { useVividHomeStore } from '@/store/vividHomeStore'
import type { EditTransformMode, LibraryModel } from '@/store/vividHomeStore'
import { LibraryModelModal } from '@/components/edit/LibraryModelModal'
import { LibraryThumbnail } from '@/components/edit/LibraryThumbnail'

export function EditHomeSidebar() {
  const library = useVividHomeStore((s) => s.library)
  const wallPictures = useVividHomeStore((s) => s.wallPictures)
  const setLibraryPlacementPending = useVividHomeStore((s) => s.setLibraryPlacementPending)
  const cancelLibraryPlacement = useVividHomeStore((s) => s.cancelLibraryPlacement)
  const libraryPlacementPending = useVividHomeStore((s) => s.libraryPlacementPending)
  const addWallPicture = useVividHomeStore((s) => s.addWallPicture)
  const removeWallPicture = useVividHomeStore((s) => s.removeWallPicture)
  const removePlaced = useVividHomeStore((s) => s.removePlaced)
  const selectedId = useVividHomeStore((s) => s.selectedPlacedId)
  const editTransformMode = useVividHomeStore((s) => s.editTransformMode)
  const setEditTransformMode = useVividHomeStore((s) => s.setEditTransformMode)
  const fileRef = useRef<HTMLInputElement>(null)
  const [modalModel, setModalModel] = useState<LibraryModel | null>(null)

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

  const transformModes: { id: EditTransformMode; label: string }[] = [
    { id: 'translate', label: 'Move' },
    { id: 'rotate', label: 'Rotate' },
    { id: 'scale', label: 'Scale' },
  ]

  return (
    <>
      <LibraryModelModal
        model={modalModel}
        onClose={() => setModalModel(null)}
        onPlaceInRoom={(libId) => setLibraryPlacementPending(libId)}
      />

      <aside className="w-full shrink-0 border-stone-200 bg-stone-50/90 p-4 lg:max-h-full lg:w-80 lg:overflow-y-auto lg:border-r">
        {libraryPlacementPending ? (
          <div className="mb-4 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <p className="font-medium">Click the floor to place your model.</p>
            <button
              type="button"
              className="mt-2 text-amber-900 underline decoration-amber-800/60 hover:decoration-amber-900"
              onClick={() => cancelLibraryPlacement()}
            >
              Cancel placement
            </button>
          </div>
        ) : null}

        <h2 className="font-serif text-lg text-stone-900">Library</h2>
        <p className="mt-1 text-xs text-stone-600">
          Tap an item for a 3D preview. Use Place in room, then click the floor. Select a piece in
          the scene to move, rotate, or scale.
        </p>
        <ul className="mt-4 space-y-2">
          {library.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setModalModel(m)}
                className="flex w-full items-center gap-3 rounded-lg border border-stone-200 bg-white p-2 text-left text-sm text-stone-800 hover:bg-stone-50"
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                  <LibraryThumbnail
                    thumbnailUrl={m.thumbnailUrl}
                    name={m.name}
                    className="h-full w-full object-cover text-lg"
                  />
                </span>
                <span className="min-w-0 flex-1 leading-snug">{m.name}</span>
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
            <>
              <div className="mt-3">
                <p className="text-xs font-medium text-stone-700">Transform</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {transformModes.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setEditTransformMode(id)}
                      className={[
                        'rounded-md border px-2.5 py-1 text-xs',
                        editTransformMode === id
                          ? 'border-stone-800 bg-stone-800 text-stone-50'
                          : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="mt-3 text-xs text-red-700 hover:underline"
                onClick={() => removePlaced(selectedId)}
              >
                Delete selected furniture
              </button>
            </>
          ) : null}
        </div>
      </aside>
    </>
  )
}
