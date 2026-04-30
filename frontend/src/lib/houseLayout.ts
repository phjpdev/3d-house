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

/** Clearance from inner wall planes so the camera stays inside the closed shell (no void / “outside”). */
const EDIT_CAM_WALL_MARGIN = 0.32

const Z_CORRIDOR_BLEND = ROOM.half + 0.28

/**
 * Keeps the orbit camera inside the living room + south corridor volume. Mutates `pos` (world space).
 * Corridor uses a tighter X bound than the main room so you never slide beside the hall mesh.
 */
export function clampEditCameraPosition(pos: THREE.Vector3): void {
  const m = EDIT_CAM_WALL_MARGIN
  const xRoom = ROOM.half - m
  const xCorridor = Math.min(xRoom, CORRIDOR.halfW - m)
  const zNorth = -ROOM.half + m
  const zSouthMax = ROOM.half + CORRIDOR.southLen - m

  pos.y = THREE.MathUtils.clamp(pos.y, 0.08, ROOM.height - 0.02)
  pos.z = THREE.MathUtils.clamp(pos.z, zNorth, zSouthMax)
  if (pos.z < Z_CORRIDOR_BLEND) {
    pos.x = THREE.MathUtils.clamp(pos.x, -xRoom, xRoom)
  } else {
    pos.x = THREE.MathUtils.clamp(pos.x, -xCorridor, xCorridor)
  }
}

/** Keeps the orbit pivot inside the same shell as {@link clampEditCameraPosition}. */
export function clampEditOrbitTarget(target: THREE.Vector3): void {
  const m = EDIT_CAM_WALL_MARGIN
  const xRoom = ROOM.half - m
  const xCorridor = Math.min(xRoom, CORRIDOR.halfW - m)
  const zNorth = -ROOM.half + m
  const zSouthMax = ROOM.half + CORRIDOR.southLen - m

  target.y = THREE.MathUtils.clamp(target.y, 0.28, ROOM.height - 0.08)
  target.z = THREE.MathUtils.clamp(target.z, zNorth, zSouthMax)
  if (target.z < Z_CORRIDOR_BLEND) {
    target.x = THREE.MathUtils.clamp(target.x, -xRoom, xRoom)
  } else {
    target.x = THREE.MathUtils.clamp(target.x, -xCorridor, xCorridor)
  }
}
