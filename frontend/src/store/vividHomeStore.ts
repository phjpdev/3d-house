import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'

export type AppTab = 'build' | 'edit' | 'visit'

export type EditTransformMode = 'translate' | 'rotate' | 'scale'

/** Saved Meshy or catalog asset */
export type LibraryModel = {
  id: string
  name: string
  prompt?: string
  glbUrl: string
  thumbnailUrl?: string
  createdAt: number
}

import type { FurnitureMount } from '@/types/house'
import type { EditStructureZone } from '@/lib/editOrbitPresets'

export type PlacedFurniture = {
  id: string
  sourceId?: string
  url: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  mount?: FurnitureMount
  lightIntensity?: number
}

export type WallPicture = {
  id: string
  imageUrl: string
  position: [number, number, number]
  rotationY: number
  rotation?: [number, number, number]
  scale?: number
  width: number
  height: number
}

type State = {
  tab: AppTab
  library: LibraryModel[]
  /** Disk catalog GLBs under `public/models` — not persisted; refreshed when Edit loads */
  userModels: LibraryModel[]
  placedFurniture: PlacedFurniture[]
  wallPictures: WallPicture[]
  selectedPlacedId: string | null
  selectedWallPictureId: string | null
  /** Visit tab: allow orbit instead of walk */
  visitUseOrbit: boolean
  /** Edit tab: TransformControls mode */
  editTransformMode: EditTransformMode
  /** Edit tab: next floor click places this library model */
  libraryPlacementPending: string | null

  /** Edit tab: orbit focus — main room vs south corridor */
  editStructureZone: EditStructureZone
  setEditStructureZone: (z: EditStructureZone) => void

  setTab: (t: AppTab) => void
  addLibraryModel: (m: Omit<LibraryModel, 'id' | 'createdAt'> & { id?: string }) => void
  removeLibraryModel: (id: string) => void
  setUserModels: (models: LibraryModel[]) => void
  setPlacedFurniture: (items: PlacedFurniture[]) => void
  upsertPlaced: (item: PlacedFurniture) => void
  removePlaced: (id: string) => void
  setSelectedPlacedId: (id: string | null) => void
  setSelectedWallPictureId: (id: string | null) => void
  addWallPicture: (pic: Omit<WallPicture, 'id'> & { id?: string }) => string
  updateWallPicture: (id: string, patch: Partial<WallPicture>) => void
  removeWallPicture: (id: string) => void
  /** Delete every placed frame that uses this image URL (e.g. after removing the file from disk). */
  removeWallPicturesByImageUrl: (imageUrl: string) => void
  /** Remove furniture instances that reference a GLB URL (e.g. deleted user model file). */
  removePlacedByModelUrl: (url: string) => void
  /** Remove furniture spawned from a Build-tab library entry. */
  removePlacedBySourceId: (sourceId: string) => void
  setVisitUseOrbit: (v: boolean) => void
  setEditTransformMode: (m: EditTransformMode) => void
  setLibraryPlacementPending: (libId: string | null) => void
  cancelLibraryPlacement: () => void
  /** Spawn library model at floor position (meters), select it, clear placement mode */
  placeLibraryAt: (libId: string, position: [number, number, number]) => void
}

const defaultFurniture: PlacedFurniture[] = [
  {
    id: 'ceiling-light-main',
    url: '/models/quaternius_cc0-icosahedron-light-1143.glb',
    position: [0.15, 0, 0.2],
    rotation: [0, 0, 0],
    scale: 0.48,
    mount: 'ceiling',
    lightIntensity: 34,
  },
  {
    id: 'ceiling-light-north',
    url: '/models/quaternius_cc0-icosahedron-light-1143.glb',
    position: [-0.35, 0, -1.35],
    rotation: [0, 0, 0],
    scale: 0.42,
    mount: 'ceiling',
    lightIntensity: 28,
  },
]

/** Old paths used `public/models/user` — rewrite to `public/models` for one rehydrate. */
function migrateModelsUserUrl(url: string): string {
  return url.replace(/^\/models\/user\//, '/models/')
}

/** Removed from scene layout; filtered out of persisted placements on rehydrate. */
const STRIPPED_PLACEMENT_IDS = new Set([
  'desk-chair',
  'sofa',
  'lounge-armchair',
  'ceiling-light-sofa',
])

export const useVividHomeStore = create<State>()(
  persist(
    (set, get) => ({
      tab: 'build',
      library: [],
      userModels: [],
      placedFurniture: defaultFurniture,
      wallPictures: [],
      selectedPlacedId: null,
      selectedWallPictureId: null,
      visitUseOrbit: false,
      editTransformMode: 'translate',
      libraryPlacementPending: null,
      editStructureZone: 'room' as EditStructureZone,

      setTab: (tab) => set({ tab }),
      addLibraryModel: (m) =>
        set((s) => ({
          library: [
            {
              id: m.id ?? uuid(),
              name: m.name,
              prompt: m.prompt,
              glbUrl: m.glbUrl,
              thumbnailUrl:
                m.thumbnailUrl && !m.thumbnailUrl.startsWith('blob:')
                  ? m.thumbnailUrl
                  : undefined,
              createdAt: Date.now(),
            },
            ...s.library,
          ],
        })),
      removeLibraryModel: (id) =>
        set((s) => ({ library: s.library.filter((x) => x.id !== id) })),
      setUserModels: (userModels) => set({ userModels }),
      setPlacedFurniture: (placedFurniture) => set({ placedFurniture }),
      upsertPlaced: (item) =>
        set((s) => {
          const i = s.placedFurniture.findIndex((p) => p.id === item.id)
          if (i < 0) return { placedFurniture: [...s.placedFurniture, item] }
          const next = [...s.placedFurniture]
          next[i] = item
          return { placedFurniture: next }
        }),
      removePlaced: (id) =>
        set((s) => ({
          placedFurniture: s.placedFurniture.filter((p) => p.id !== id),
          selectedPlacedId: s.selectedPlacedId === id ? null : s.selectedPlacedId,
        })),
      setSelectedPlacedId: (selectedPlacedId) =>
        set((s) => ({
          selectedPlacedId,
          ...(selectedPlacedId !== null ? { selectedWallPictureId: null as string | null } : {}),
        })),
      setSelectedWallPictureId: (selectedWallPictureId) =>
        set((s) => ({
          selectedWallPictureId,
          ...(selectedWallPictureId !== null ? { selectedPlacedId: null as string | null } : {}),
        })),
      addWallPicture: (pic) => {
        const id = pic.id ?? uuid()
        set((s) => ({
          wallPictures: [
            ...s.wallPictures,
            {
              id,
              imageUrl: pic.imageUrl,
              position: pic.position,
              rotationY: pic.rotationY,
              rotation: pic.rotation,
              scale: pic.scale,
              width: pic.width,
              height: pic.height,
            },
          ],
        }))
        return id
      },
      updateWallPicture: (id, patch) =>
        set((s) => ({
          wallPictures: s.wallPictures.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),
      removeWallPicture: (id) =>
        set((s) => ({
          wallPictures: s.wallPictures.filter((w) => w.id !== id),
          selectedWallPictureId: s.selectedWallPictureId === id ? null : s.selectedWallPictureId,
        })),
      removeWallPicturesByImageUrl: (imageUrl) =>
        set((s) => {
          const next = s.wallPictures.filter((w) => w.imageUrl !== imageUrl)
          const removedIds = new Set(s.wallPictures.filter((w) => w.imageUrl === imageUrl).map((w) => w.id))
          return {
            wallPictures: next,
            selectedWallPictureId:
              s.selectedWallPictureId && removedIds.has(s.selectedWallPictureId)
                ? null
                : s.selectedWallPictureId,
          }
        }),
      removePlacedByModelUrl: (url) =>
        set((s) => {
          const removedIds = new Set(s.placedFurniture.filter((p) => p.url === url).map((p) => p.id))
          return {
            placedFurniture: s.placedFurniture.filter((p) => p.url !== url),
            selectedPlacedId:
              s.selectedPlacedId && removedIds.has(s.selectedPlacedId)
                ? null
                : s.selectedPlacedId,
          }
        }),
      removePlacedBySourceId: (sourceId) =>
        set((s) => {
          const removed = new Set(
            s.placedFurniture.filter((p) => p.sourceId === sourceId).map((p) => p.id),
          )
          return {
            placedFurniture: s.placedFurniture.filter((p) => p.sourceId !== sourceId),
            selectedPlacedId:
              s.selectedPlacedId && removed.has(s.selectedPlacedId) ? null : s.selectedPlacedId,
          }
        }),
      setVisitUseOrbit: (visitUseOrbit) => set({ visitUseOrbit }),
      setEditTransformMode: (editTransformMode) => set({ editTransformMode }),
      setEditStructureZone: (editStructureZone) => set({ editStructureZone }),
      setLibraryPlacementPending: (libraryPlacementPending) => set({ libraryPlacementPending }),
      cancelLibraryPlacement: () => set({ libraryPlacementPending: null }),
      placeLibraryAt: (libId, position) => {
        const { library, userModels } = get()
        const lib =
          library.find((l) => l.id === libId) ?? userModels.find((l) => l.id === libId)
        if (!lib) return
        const id = `placed-${lib.id}-${Date.now()}`
        set((s) => ({
          libraryPlacementPending: null,
          selectedPlacedId: id,
          selectedWallPictureId: null,
          placedFurniture: [
            ...s.placedFurniture,
            {
              id,
              sourceId: lib.id,
              url: lib.glbUrl,
              position,
              rotation: [0, 0, 0],
              scale: 0.5,
            },
          ],
        }))
      },
    }),
    {
      name: 'vividhome-state',
      partialize: (s) => ({
        library: s.library,
        placedFurniture: s.placedFurniture,
        wallPictures: s.wallPictures,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<Pick<State, 'library' | 'placedFurniture' | 'wallPictures'>>
        const placed = (p.placedFurniture ?? current.placedFurniture)
          .filter((item) => !STRIPPED_PLACEMENT_IDS.has(item.id))
          .map((item) => ({
            ...item,
            url: migrateModelsUserUrl(item.url),
          }))
        const nextLib = (p.library ?? current.library).map((m) => ({
          ...m,
          glbUrl: migrateModelsUserUrl(m.glbUrl),
          thumbnailUrl:
            m.thumbnailUrl?.startsWith('blob:') ? undefined : m.thumbnailUrl,
        }))
        return {
          ...current,
          ...p,
          library: nextLib,
          placedFurniture: placed,
        }
      },
    },
  ),
)

export function spawnPosition(): [number, number, number] {
  return [0, 0, 2.2]
}
