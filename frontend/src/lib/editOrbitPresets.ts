import * as THREE from 'three'
import type { OrbitControls } from 'three-stdlib'
import { CORRIDOR_GEOM, ROOM } from '@/lib/houseLayout'

export type EditStructureZone = 'room' | 'corridor'

/** Snap edit orbit to the main chamber (matches default InteriorShell framing). */
export function applyEditStructurePreset(
  zone: EditStructureZone,
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
): void {
  if (zone === 'room') {
    controls.target.set(0, 1.15, -1.2)
    camera.position.set(2.85, 1.42, 2.35)
  } else {
    const zMid = CORRIDOR_GEOM.zSouthMid
    controls.target.set(0, 1.05, zMid)
    camera.position.set(0, 1.18, ROOM.half + 0.95)
  }
  controls.update()
}
