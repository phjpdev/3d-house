import * as THREE from 'three'

/** Main chamber inner half-size (meters). */
export const ROOM = {
  half: 3.75,
  wallT: 0.14,
  height: 3.05,
} as const

/** South + east L-shaped corridors (procedural template only). */
export const CORRIDOR = {
  halfW: 0.68,
  southLen: 5.45,
  eastLen: 2.95,
} as const

export const PLAYER_RADIUS = 0.22

const PR = PLAYER_RADIUS
const HX = ROOM.half - PR
const HZ = ROOM.half - PR
const CX = Math.min(HX, 0.65 - PR)

const hw = CORRIDOR.halfW
const sl = CORRIDOR.southLen
const el = CORRIDOR.eastLen

const zEastHalf = hw * 1.02
const zEastMid = ROOM.half + sl - zEastHalf
const xEast0 = hw - 0.04
const eastFloorLen = el + hw * 0.5
const eastFloorCx = xEast0 + eastFloorLen / 2

/** Shared numbers for `Corridors.tsx` meshes and walk logic */
export const CORRIDOR_GEOM = {
  zSouthMid: ROOM.half + sl / 2,
  xEast0,
  eastFloorLen,
  zEastHalf,
  zEastMid,
  eastFloorCx,
} as const

const EAST_X_MIN = xEast0 + PR
const EAST_X_MAX = HX
const EAST_Z_MIN = zEastMid - zEastHalf + PR
const EAST_Z_MAX = zEastMid + zEastHalf - PR

const Z_SOUTH_MAX = ROOM.half + sl - PR

export function inWalkable(x: number, z: number): boolean {
  if (Math.abs(x) <= HX && Math.abs(z) <= HZ) return true
  if (Math.abs(x) <= CX && z > HZ && z <= Z_SOUTH_MAX) return true
  if (x >= EAST_X_MIN && x <= EAST_X_MAX && z >= EAST_Z_MIN && z <= EAST_Z_MAX) return true
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

  const bx = THREE.MathUtils.clamp(nx, EAST_X_MIN, EAST_X_MAX)
  const bz = THREE.MathUtils.clamp(nz, EAST_Z_MIN, EAST_Z_MAX)
  if (inWalkable(bx, bz)) return [bx, bz]

  return [ox, oz]
}
