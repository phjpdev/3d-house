import type { MeshStandardMaterial } from 'three'

/** Shared materials for procedural room + corridors (one instance per surface type). */
export type InteriorShellMaterials = {
  floor: MeshStandardMaterial
  wall: MeshStandardMaterial
  ceiling: MeshStandardMaterial
  trim: MeshStandardMaterial
  desk: MeshStandardMaterial
}
