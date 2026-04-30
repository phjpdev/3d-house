'use client'

import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, Environment, OrbitControls } from '@react-three/drei'
import { configureRenderer } from '@/lib/configureRenderer'
import { FurnitureMesh } from '@/components/interior/FurnitureMesh'
import { LibraryThumbnail } from '@/components/edit/LibraryThumbnail'
import type { LibraryModel } from '@/store/vividHomeStore'

const PREVIEW_HDRI =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/brown_photostudio_06_1k.hdr'

function ModalPreviewModel({ url }: { url: string }) {
  return (
    <Bounds fit clip observe margin={1.04} maxDuration={0.45}>
      <FurnitureMesh
        item={{
          id: 'library-preview',
          url,
          position: [0, 0, 0],
          scale: 1,
        }}
      />
    </Bounds>
  )
}

type Props = {
  model: LibraryModel | null
  onClose: () => void
  onPlaceInRoom: (libId: string) => void
  /** Remove this entry from the Build list or delete the file under `public/models`. */
  onRemoveFromList?: () => void | Promise<void>
}

export function LibraryModelModal({ model, onClose, onPlaceInRoom, onRemoveFromList }: Props) {
  useEffect(() => {
    if (!model) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [model, onClose])

  if (!model) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-stone-200 bg-stone-50 shadow-2xl sm:max-w-6xl">
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 px-5 py-4 sm:px-6">
          <h2 id="library-modal-title" className="font-serif text-xl text-stone-900 sm:text-2xl">
            {model.name}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-md px-2 py-1 text-sm text-stone-600 hover:bg-stone-200/80"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:gap-6 sm:p-6">
          <div className="mx-auto h-44 w-44 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white sm:mx-0 sm:h-48 sm:w-48">
            <LibraryThumbnail
              thumbnailUrl={model.thumbnailUrl}
              name={model.name}
              className="h-full w-full object-cover text-2xl"
            />
          </div>

          <div className="relative min-h-[min(58vh,560px)] min-w-0 flex-1 overflow-hidden rounded-xl border border-stone-200 bg-stone-200/40 sm:min-h-[500px]">
            <Canvas
              className="h-[min(58vh,560px)] w-full min-h-[360px] touch-none sm:h-[500px] sm:min-h-[500px]"
              shadows
              dpr={[1, 2]}
              camera={{ position: [2.2, 1.45, 2.6], fov: 42, near: 0.04, far: 80 }}
              gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
              onCreated={({ gl }) => configureRenderer(gl)}
            >
              <color attach="background" args={['#e8e2da']} />
              <hemisphereLight args={['#fff8f0', '#c4bbb0', 0.58]} />
              <directionalLight position={[4.5, 7, 3.5]} intensity={0.88} castShadow />
              <Suspense fallback={null}>
                <Environment files={PREVIEW_HDRI} environmentIntensity={0.58} />
              </Suspense>
              <Suspense fallback={null}>
                <ModalPreviewModel url={model.glbUrl} />
              </Suspense>
              <OrbitControls
                makeDefault
                enableDamping
                dampingFactor={0.06}
                minDistance={0.55}
                maxDistance={12}
                target={[0, 0.35, 0]}
              />
            </Canvas>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 px-5 py-4 sm:px-6">
          <p className="mr-auto max-w-[58%] text-sm text-stone-600 sm:max-w-[50%]">
            Place in room, then click the floor where you want it (Esc cancels).
          </p>
          <button
            type="button"
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 hover:bg-stone-100"
            onClick={onClose}
          >
            Cancel
          </button>
          {onRemoveFromList ? (
            <button
              type="button"
              className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-800 hover:bg-red-50"
              onClick={() => {
                void Promise.resolve(onRemoveFromList()).finally(() => onClose())
              }}
            >
              Remove
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-50 hover:bg-stone-700"
            onClick={() => {
              onPlaceInRoom(model.id)
              onClose()
            }}
          >
            Place in room
          </button>
        </div>
      </div>
    </div>
  )
}
