import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'

export type AppTab = 'build' | 'edit' | 'visit'

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
  width: number
  height: number
}

type State = {
  tab: AppTab
  library: LibraryModel[]
  placedFurniture: PlacedFurniture[]
  wallPictures: WallPicture[]
  selectedPlacedId: string | null
  /** Visit tab: allow orbit instead of walk */
  visitUseOrbit: boolean

  setTab: (t: AppTab) => void
  addLibraryModel: (m: Omit<LibraryModel, 'id' | 'createdAt'> & { id?: string }) => void
  removeLibraryModel: (id: string) => void
  setPlacedFurniture: (items: PlacedFurniture[]) => void
  upsertPlaced: (item: PlacedFurniture) => void
  removePlaced: (id: string) => void
  setSelectedPlacedId: (id: string | null) => void
  addWallPicture: (pic: Omit<WallPicture, 'id'> & { id?: string }) => void
  updateWallPicture: (id: string, patch: Partial<WallPicture>) => void
  removeWallPicture: (id: string) => void
  setVisitUseOrbit: (v: boolean) => void
  placeLibraryAtCenter: (libId: string) => void
}

const defaultFurniture: PlacedFurniture[] = [
  {
    id: 'sofa',
    sourceId: 'sofa',
    url: '/models/manseok_kim-sofa-2118.glb',
    position: [-1.05, 0, -3.18],
    rotation: [0, 0, 0],
    scale: 36,
  },
  {
    id: 'lounge-armchair',
    sourceId: 'armchair',
    url: '/models/denielcz-armchair-2924.glb',
    position: [1.52, 0, -2.38],
    rotation: [0, 2.7, 0],
    scale: 1,
  },
  {
    id: 'desk-chair',
    url: '/models/quaternius_cc0-office-chair-1192.glb',
    position: [2.32, 0, -1.38],
    rotation: [0, -0.52, 0],
    scale: 0.5,
  },
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
    id: 'ceiling-light-sofa',
    url: '/models/quaternius_cc0-icosahedron-light-1143.glb',
    position: [-2.35, 0, 0.35],
    rotation: [0, 0, 0],
    scale: 0.4,
    mount: 'ceiling',
    lightIntensity: 26,
  },
]

export const useVividHomeStore = create<State>()(
  persist(
    (set, get) => ({
      tab: 'build',
      library: [],
      placedFurniture: defaultFurniture,
      wallPictures: [],
      selectedPlacedId: null,
      visitUseOrbit: false,

      setTab: (tab) => set({ tab }),
      addLibraryModel: (m) =>
        set((s) => ({
          library: [
            {
              id: m.id ?? uuid(),
              name: m.name,
              prompt: m.prompt,
              glbUrl: m.glbUrl,
              thumbnailUrl: m.thumbnailUrl,
              createdAt: Date.now(),
            },
            ...s.library,
          ],
        })),
      removeLibraryModel: (id) =>
        set((s) => ({ library: s.library.filter((x) => x.id !== id) })),
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
      setSelectedPlacedId: (selectedPlacedId) => set({ selectedPlacedId }),
      addWallPicture: (pic) =>
        set((s) => ({
          wallPictures: [
            ...s.wallPictures,
            {
              id: pic.id ?? uuid(),
              imageUrl: pic.imageUrl,
              position: pic.position,
              rotationY: pic.rotationY,
              width: pic.width,
              height: pic.height,
            },
          ],
        })),
      updateWallPicture: (id, patch) =>
        set((s) => ({
          wallPictures: s.wallPictures.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),
      removeWallPicture: (id) =>
        set((s) => ({ wallPictures: s.wallPictures.filter((w) => w.id !== id) })),
      setVisitUseOrbit: (visitUseOrbit) => set({ visitUseOrbit }),
      placeLibraryAtCenter: (libId) => {
        const lib = get().library.find((l) => l.id === libId)
        if (!lib) return
        const id = `placed-${lib.id}-${Date.now()}`
        set((s) => ({
          placedFurniture: [
            ...s.placedFurniture,
            {
              id,
              sourceId: lib.id,
              url: lib.glbUrl,
              position: [0.2, 0, -0.5],
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
    },
  ),
)

export function spawnPosition(): [number, number, number] {
  return [0, 0, 2.2]
}
