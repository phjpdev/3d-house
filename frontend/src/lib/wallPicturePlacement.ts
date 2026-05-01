import * as THREE from 'three'

/** Procedural shell meshes that accept wall frames (inner plaster faces). */
export const WALL_PICTURE_SURFACE_MESH_NAMES = new Set([
  'WallNorthLeft',
  'WallNorthRight',
  'WallNorthSill',
  'WallNorthLint',
  'WallSouthLeft',
  'WallSouthRight',
  'WallSouthHeader',
  'WallEast',
  'WallWest',
  'CorridorSouthWallWest',
  'CorridorSouthWallEast',
  'CorridorSouthEnd',
])

export function isWallPictureSurface(obj: THREE.Object3D): boolean {
  return Boolean(obj.name && WALL_PICTURE_SURFACE_MESH_NAMES.has(obj.name))
}

const FRAME_DEPTH = 0.04
const SURFACE_BIAS = 0.02

function hitTouchesWallSurface(hit: THREE.Intersection): boolean {
  let o: THREE.Object3D | null = hit.object
  while (o) {
    if (isWallPictureSurface(o)) return true
    o = o.parent
  }
  return false
}

/**
 * Frame origin + Y rotation so the picture faces into the room (camera-facing hemisphere).
 * Matches {@link ExhibitMesh} wall_frame: local +Z is the photo normal.
 */
export function wallPicturePlacementFromHit(
  hit: THREE.Intersection,
  camera: THREE.Camera,
): { position: [number, number, number]; rotationY: number } | null {
  if (!hit.face?.normal || !hitTouchesWallSurface(hit)) return null

  const normal = new THREE.Vector3().copy(hit.face.normal).transformDirection(hit.object.matrixWorld)
  normal.normalize()

  const towardCam = new THREE.Vector3().subVectors(camera.position, hit.point).normalize()
  if (normal.dot(towardCam) < 0) normal.negate()

  const offset = FRAME_DEPTH / 2 + SURFACE_BIAS
  const pos = new THREE.Vector3().copy(hit.point).addScaledVector(normal, offset)

  const nXZ = new THREE.Vector3(normal.x, 0, normal.z)
  if (nXZ.lengthSq() < 1e-8) return null
  nXZ.normalize()
  const rotationY = Math.atan2(nXZ.x, nXZ.z)

  return { position: [pos.x, pos.y, pos.z], rotationY }
}
