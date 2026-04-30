'use client'

import { useEffect } from 'react'

export type CatalogPhoto = {
  filename: string
  url: string
  name: string
}

type Props = {
  photo: CatalogPhoto | null
  onClose: () => void
  /** Deletes the file under `public/photos` and removes scene frames that used it. */
  onRemoveFromDisk: () => void | Promise<void>
  /** Adds this image to the wall and selects it for transforms. */
  onPlaceInHome: () => void
}

export function WallArtModal({ photo, onClose, onRemoveFromDisk, onPlaceInHome }: Props) {
  useEffect(() => {
    if (!photo) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photo, onClose])

  if (!photo) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wall-art-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-stone-200 bg-stone-50 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4">
          <h2 id="wall-art-modal-title" className="font-serif text-xl text-stone-900">
            {photo.name}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-md px-2 py-1 text-sm text-stone-600 hover:bg-stone-200/80"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="flex justify-center bg-stone-200/30 p-6 sm:p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt=""
            className="max-h-[min(62vh,520px)] w-auto max-w-full rounded-lg border border-stone-200 object-contain shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 px-5 py-4">
          <p className="mr-auto max-w-[58%] text-sm text-stone-600">
            Place in home adds this picture to the wall. Then use Move / Rotate / Scale in the sidebar,
            and drag the handles in the scene.
          </p>
          <button
            type="button"
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 hover:bg-stone-100"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-800 hover:bg-red-50"
            onClick={() => {
              void Promise.resolve(onRemoveFromDisk()).finally(() => onClose())
            }}
          >
            Remove
          </button>
          <button
            type="button"
            className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-50 hover:bg-stone-700"
            onClick={() => {
              onPlaceInHome()
              onClose()
            }}
          >
            Place in home
          </button>
        </div>
      </div>
    </div>
  )
}
