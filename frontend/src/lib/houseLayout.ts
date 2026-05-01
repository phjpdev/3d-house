import * as THREE from 'three'

/** Main chamber inner half-size (meters). */
export const ROOM = {
  half: 3.75,
  wallT: 0.14,
  height: 3.05,
} as const

/** South corridor: straight hall (no L-turn) */
export const CORRIDOR = {
  halfW: 1.5,
  southLen: 5.45,
} as const

/**
 * Used only for tight corridors (`halfW` small): orbit `minDistance` must stay below inner half-width
 * when the pivot is on the centerline, or the camera intersects side walls.
 */
export const CORRIDOR_EDIT_MIN_ORBIT_DISTANCE = Math.max(0.36, CORRIDOR.halfW - 0.22)

export const PLAYER_RADIUS = 0.22

const PR = PLAYER_RADIUS
const HX = ROOM.half - PR
const HZ = ROOM.half - PR

const hw = CORRIDOR.halfW
const sl = CORRIDOR.southLen

/** Walkable X half-width in the south leg (throat width near door) */
const SOUTH_X = Math.min(HX, hw * 1.02 - PR)

const Z_SOUTH_MAX = ROOM.half + sl - PR

const zSouthMid = ROOM.half + sl / 2

export const CORRIDOR_GEOM = {
  zSouthMid,
  southLen: sl,
} as const

export function inWalkable(x: number, z: number): boolean {
  if (Math.abs(x) <= HX && Math.abs(z) <= HZ) return true
  if (z > HZ && z <= Z_SOUTH_MAX && Math.abs(x) <= SOUTH_X) return true
  return false
}

export function resolveWalkPosition(
  nx: number,
  nz: number,
  ox: number,
  oz: number,
): [number, number] {
  if (inWalkable(nx, nz)) return [nx, nz]
  if (inWalkable(nx, oz)) return [nx, oz]
  if (inWalkable(ox, nz)) return [ox, nz]

  const ax = THREE.MathUtils.clamp(nx, -HX, HX)
  const az = THREE.MathUtils.clamp(nz, -HZ, Z_SOUTH_MAX)
  if (inWalkable(ax, az)) return [ax, az]
  const xb = THREE.MathUtils.clamp(nx, -SOUTH_X, SOUTH_X)
  if (inWalkable(xb, nz)) return [xb, nz]
  if (inWalkable(xb, oz)) return [xb, oz]
  return [ox, oz]
}

/**
 * Large axis-aligned workspace for orbit pan (Coohom-style BIM grid): right-drag slides the model
 * on screen instead of hitting tight interior limits immediately.
 */
export const BIM_ORBIT_WORKSPACE = {
  xHalf: 52,
  zNorth: -52,
  zSouth: 56,
  yMin: 0.06,
  yMax: 56,
} as const

/**
 * Keeps the orbit camera inside {@link BIM_ORBIT_WORKSPACE}. Mutates `pos` (world space).
 */
export function clampEditCameraPosition(pos: THREE.Vector3): void {
  const { xHalf, zNorth, zSouth, yMin, yMax } = BIM_ORBIT_WORKSPACE
  pos.x = THREE.MathUtils.clamp(pos.x, -xHalf, xHalf)
  pos.y = THREE.MathUtils.clamp(pos.y, yMin, yMax)
  pos.z = THREE.MathUtils.clamp(pos.z, zNorth, zSouth)
}

/** Keeps the orbit pivot inside {@link BIM_ORBIT_WORKSPACE}. */
export function clampEditOrbitTarget(target: THREE.Vector3): void {
  const { xHalf, zNorth, zSouth, yMin, yMax } = BIM_ORBIT_WORKSPACE
  target.x = THREE.MathUtils.clamp(target.x, -xHalf, xHalf)
  target.y = THREE.MathUtils.clamp(target.y, Math.max(yMin, 0.22), yMax)
  target.z = THREE.MathUtils.clamp(target.z, zNorth, zSouth)
}
