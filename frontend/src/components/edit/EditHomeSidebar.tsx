'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useVividHomeStore } from '@/store/vividHomeStore'
import type { EditTransformMode, LibraryModel } from '@/store/vividHomeStore'
import { LibraryModelModal } from '@/components/edit/LibraryModelModal'
import { LibraryThumbnail } from '@/components/edit/LibraryThumbnail'
import { WallArtModal, type CatalogPhoto } from '@/components/edit/WallArtModal'

type UserModelsResponse = { models: { filename: string; url: string; name: string }[] }
type PhotosResponse = { photos: CatalogPhoto[] }

function toUserLibraryModels(data: UserModelsResponse): LibraryModel[] {
  return data.models.map((m, i) => ({
    id: `user:${m.filename}`,
    name: m.name,
    glbUrl: m.url,
    createdAt: i,
  }))
}

export function EditHomeSidebar() {
  const library = useVividHomeStore((s) => s.library)
  const userModels = useVividHomeStore((s) => s.userModels)
  const setUserModels = useVividHomeStore((s) => s.setUserModels)
  const wallPictures = useVividHomeStore((s) => s.wallPictures)
  const setLibraryPlacementPending = useVividHomeStore((s) => s.setLibraryPlacementPending)
  const cancelLibraryPlacement = useVividHomeStore((s) => s.cancelLibraryPlacement)
  const libraryPlacementPending = useVividHomeStore((s) => s.libraryPlacementPending)
  const beginWallArtPlacement = useVividHomeStore((s) => s.beginWallArtPlacement)
  const cancelWallArtPlacement = useVividHomeStore((s) => s.cancelWallArtPlacement)
  const wallArtPlacementPending = useVividHomeStore((s) => s.wallArtPlacementPending)
  const removeWallPicture = useVividHomeStore((s) => s.removeWallPicture)
  const removeWallPicturesByImageUrl = useVividHomeStore((s) => s.removeWallPicturesByImageUrl)
  const removeLibraryModel = useVividHomeStore((s) => s.removeLibraryModel)
  const removePlacedByModelUrl = useVividHomeStore((s) => s.removePlacedByModelUrl)
  const removePlacedBySourceId = useVividHomeStore((s) => s.removePlacedBySourceId)
  const removePlaced = useVividHomeStore((s) => s.removePlaced)
  const selectedId = useVividHomeStore((s) => s.selectedPlacedId)
  const selectedWallPictureId = useVividHomeStore((s) => s.selectedWallPictureId)
  const setSelectedWallPictureId = useVividHomeStore((s) => s.setSelectedWallPictureId)
  const editTransformMode = useVividHomeStore((s) => s.editTransformMode)
  const setEditTransformMode = useVividHomeStore((s) => s.setEditTransformMode)
  const editStructureZone = useVividHomeStore((s) => s.editStructureZone)
  const setEditStructureZone = useVividHomeStore((s) => s.setEditStructureZone)
  const photoFileRef = useRef<HTMLInputElement>(null)
  const glbFileRef = useRef<HTMLInputElement>(null)
  const [modalModel, setModalModel] = useState<LibraryModel | null>(null)
  const [modalWallPhoto, setModalWallPhoto] = useState<CatalogPhoto | null>(null)
  const [assetTab, setAssetTab] = useState<'library' | 'wallArt'>('library')
  const [userListError, setUserListError] = useState<string | null>(null)
  const [userListLoaded, setUserListLoaded] = useState(false)
  const [photoCatalog, setPhotoCatalog] = useState<CatalogPhoto[]>([])
  const [photosError, setPhotosError] = useState<string | null>(null)
  const [photosLoaded, setPhotosLoaded] = useState(false)
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null)
  const [modelUploadError, setModelUploadError] = useState<string | null>(null)

  const loadUserModels = useCallback(async () => {
    const res = await fetch('/api/models')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as UserModelsResponse
    setUserModels(toUserLibraryModels(data))
  }, [setUserModels])

  const loadPhotos = useCallback(async () => {
    const res = await fetch('/api/photos')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as PhotosResponse
    setPhotoCatalog(data.photos ?? [])
  }, [])

  useEffect(() => {
    let cancelled = false
    setUserListError(null)
    setUserListLoaded(false)
    loadUserModels()
      .catch((e: unknown) => {
        if (!cancelled)
          setUserListError(e instanceof Error ? e.message : 'Could not load public/models')
      })
      .finally(() => {
        if (!cancelled) setUserListLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [loadUserModels])

  useEffect(() => {
    let cancelled = false
    setPhotosError(null)
    setPhotosLoaded(false)
    loadPhotos()
      .catch((e: unknown) => {
        if (!cancelled)
          setPhotosError(e instanceof Error ? e.message : 'Could not load public/photos')
      })
      .finally(() => {
        if (!cancelled) setPhotosLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [loadPhotos])

  const removeLibraryFromModal = async () => {
    const m = modalModel
    if (!m) return
    if (m.id.startsWith('user:')) {
      const filename = m.id.slice('user:'.length)
      const res = await fetch(`/api/models?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : `HTTP ${res.status}`)
      }
      removePlacedByModelUrl(m.glbUrl)
      await loadUserModels()
      return
    }
    removeLibraryModel(m.id)
    removePlacedBySourceId(m.id)
  }

  const onWallUpload = async (f: File | null) => {
    if (!f) return
    setPhotoUploadError(null)
    const fd = new FormData()
    fd.append('file', f)
    try {
      const res = await fetch('/api/photos', { method: 'POST', body: fd })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      await loadPhotos()
    } catch (e: unknown) {
      setPhotoUploadError(e instanceof Error ? e.message : 'Upload failed')
    }
    if (photoFileRef.current) photoFileRef.current.value = ''
  }

  const onModelUpload = async (f: File | null) => {
    if (!f) return
    setModelUploadError(null)
    const fd = new FormData()
    fd.append('file', f)
    try {
      const res = await fetch('/api/models', { method: 'POST', body: fd })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      await loadUserModels()
    } catch (e: unknown) {
      setModelUploadError(e instanceof Error ? e.message : 'Upload failed')
    }
    if (glbFileRef.current) glbFileRef.current.value = ''
  }

  const transformModes: { id: EditTransformMode; label: string }[] = [
    { id: 'translate', label: 'Move' },
    { id: 'rotate', label: 'Rotate' },
    { id: 'scale', label: 'Scale' },
  ]

  const selectedWallPlaced = wallPictures.find((w) => w.id === selectedWallPictureId)

  return (
    <>
      <LibraryModelModal
        model={modalModel}
        onClose={() => setModalModel(null)}
        onPlaceInRoom={(libId) => setLibraryPlacementPending(libId)}
        onRemoveFromList={removeLibraryFromModal}
      />

      <WallArtModal
        photo={modalWallPhoto}
        onClose={() => setModalWallPhoto(null)}
        onRemoveFromDisk={async () => {
          const p = modalWallPhoto
          if (!p) return
          const res = await fetch(`/api/photos?filename=${encodeURIComponent(p.filename)}`, {
            method: 'DELETE',
          })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(typeof err.error === 'string' ? err.error : `HTTP ${res.status}`)
          }
          removeWallPicturesByImageUrl(p.url)
          await loadPhotos()
        }}
        onPlaceInHome={() => {
          const p = modalWallPhoto
          if (!p) return
          beginWallArtPlacement({
            imageUrl: p.url,
            width: 0.72,
            height: 0.56,
          })
        }}
      />

      <aside className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden border-stone-200 bg-stone-50/90 p-4 lg:max-h-full lg:h-full lg:w-80 lg:border-r">
        <div className="shrink-0 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Structure
          </p>
          <button
            type="button"
            onClick={() => setEditStructureZone('room')}
            className={[
              'w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
              editStructureZone === 'room'
                ? 'border-stone-800 bg-stone-800 text-stone-50'
                : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100',
            ].join(' ')}
          >
            Room
          </button>
          <button
            type="button"
            onClick={() => setEditStructureZone('corridor')}
            className={[
              'w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
              editStructureZone === 'corridor'
                ? 'border-stone-800 bg-stone-800 text-stone-50'
                : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100',
            ].join(' ')}
          >
            Corridor
          </button>
        </div>

        <div className="mt-4 flex shrink-0 gap-1 rounded-lg border border-stone-300 bg-stone-200/40 p-1">
          <button
            type="button"
            onClick={() => setAssetTab('library')}
            className={[
              'min-h-[2.25rem] flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium sm:text-sm',
              assetTab === 'library'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900',
            ].join(' ')}
          >
            Home library
          </button>
          <button
            type="button"
            onClick={() => setAssetTab('wallArt')}
            className={[
              'min-h-[2.25rem] flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium sm:text-sm',
              assetTab === 'wallArt'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900',
            ].join(' ')}
          >
            Wall art
          </button>
        </div>

        {libraryPlacementPending ? (
          <div className="mt-3 shrink-0 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-950">
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

        {wallArtPlacementPending ? (
          <div className="mt-3 shrink-0 rounded-lg border border-sky-300/80 bg-sky-50 px-3 py-2 text-xs text-sky-950">
            <p className="font-medium">Click a wall in the 3D view to hang this picture.</p>
            <button
              type="button"
              className="mt-2 text-sky-900 underline decoration-sky-800/60 hover:decoration-sky-900"
              onClick={() => cancelWallArtPlacement()}
            >
              Cancel placement
            </button>
          </div>
        ) : null}

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto lg:min-h-[100px]">
          {assetTab === 'library' ? (
            <>
              <p className="text-xs text-stone-600">
                Models in <span className="font-mono text-[11px]">public/models</span>. Preview an
                item, Place in room, then click the floor.{' '}
                <span className="text-stone-500">
                  Corridor: use Structure → Corridor. Right-drag pans along the hall.
                </span>
              </p>

              <div className="mt-3">
                <input
                  ref={glbFileRef}
                  type="file"
                  accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                  className="hidden"
                  onChange={(e) => void onModelUpload(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => glbFileRef.current?.click()}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
                >
                  Upload 3D model (.glb / .gltf)
                </button>
                {modelUploadError ? (
                  <p className="mt-2 text-xs text-red-700">{modelUploadError}</p>
                ) : null}
                {userListError ? (
                  <p className="mt-2 text-xs text-amber-800">{userListError}</p>
                ) : null}

                {userModels.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {userModels.map((m) => (
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
                  </ul>
                ) : !userListError && userListLoaded && userModels.length === 0 ? (
                  <p className="mt-2 text-xs text-stone-500">
                    No models yet — upload a .glb or .gltf above.
                  </p>
                ) : null}
              </div>

              <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-stone-500">
                Build tab
              </h3>
              <ul className="mt-2 space-y-2">
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
                  <li className="text-xs text-stone-500">
                    No generated models — use Build to add one.
                  </li>
                ) : null}
              </ul>
            </>
          ) : (
            <>
              <p className="text-xs text-stone-600">
                Images in <span className="font-mono text-[11px]">public/photos</span>. Upload, open a
                thumbnail, then <span className="font-medium">Place in home</span> and click the wall where
                you want the frame. Press Esc to cancel placement. Click a frame in the scene to select it.
              </p>
              <input
                ref={photoFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onWallUpload(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => photoFileRef.current?.click()}
                className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
              >
                Add picture to wall
              </button>
              {photoUploadError ? (
                <p className="mt-2 text-xs text-red-700">{photoUploadError}</p>
              ) : null}
              {photosError ? (
                <p className="mt-2 text-xs text-amber-800">{photosError}</p>
              ) : null}
              <ul className="mt-3 space-y-2">
                {photoCatalog.map((w) => (
                  <li key={w.filename}>
                    <button
                      type="button"
                      onClick={() => setModalWallPhoto(w)}
                      className="flex w-full items-center gap-3 rounded-lg border border-stone-200 bg-white p-2 text-left text-sm text-stone-800 hover:bg-stone-50"
                    >
                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                        <LibraryThumbnail
                          thumbnailUrl={w.url}
                          name={w.name}
                          className="h-full w-full object-cover text-lg"
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate leading-snug">{w.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {!photosError && photosLoaded && photoCatalog.length === 0 ? (
                <p className="mt-2 text-xs text-stone-500">
                  No images in public/photos yet — upload one above.
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="mt-4 shrink-0 border-t border-stone-200 pt-4">
          <h3 className="font-serif text-base text-stone-900">Selection</h3>
          <p className="mt-1 text-xs text-stone-600">
            Selected:{' '}
            {selectedId
              ? `furniture · ${selectedId}`
              : selectedWallPictureId
                ? `wall art · ${
                    selectedWallPlaced?.imageUrl?.includes('/')
                      ? decodeURIComponent(selectedWallPlaced.imageUrl.split('/').pop() ?? '')
                      : selectedWallPictureId.slice(0, 8)
                  }`
                : 'none'}{' '}
            — click empty space to clear.
          </p>
          {(selectedId || selectedWallPictureId) ? (
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
              {selectedId ? (
                <button
                  type="button"
                  className="mt-3 text-xs text-red-700 hover:underline"
                  onClick={() => removePlaced(selectedId)}
                >
                  Delete selected furniture
                </button>
              ) : null}
              {selectedWallPictureId && !selectedId ? (
                <button
                  type="button"
                  className="mt-3 text-xs text-red-700 hover:underline"
                  onClick={() => removeWallPicture(selectedWallPictureId)}
                >
                  Delete wall art
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </aside>
    </>
  )
}
