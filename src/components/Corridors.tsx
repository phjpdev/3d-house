import { useMemo } from 'react'
import * as THREE from 'three'
import { CORRIDOR, CORRIDOR_GEOM, ROOM } from '../lib/houseLayout'

const wallColor = '#e8e4dc'
const floorColor = '#bcb2a2'
const trimColor = '#6b5b4d'

const h = ROOM.height
const t = ROOM.wallT
const { zSouthMid, eastFloorLen, zEastHalf, zEastMid, eastFloorCx } = CORRIDOR_GEOM
const sl = CORRIDOR.southLen
const hw = CORRIDOR.halfW

/**
 * L-shaped corridors: south from the living-room door, then a short east wing.
 * Only used with the procedural room template.
 */
export function Corridors() {
  const floorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: floorColor,
        roughness: 0.9,
        metalness: 0.02,
      }),
    [],
  )
  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: wallColor,
        roughness: 0.88,
        metalness: 0.0,
      }),
    [],
  )
  const trimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: trimColor,
        roughness: 0.75,
        metalness: 0.05,
      }),
    [],
  )

  return (
    <group name="Corridors">
      {/* South corridor floor */}
      <mesh
        name="CorridorSouthFloor"
        position={[0, -t / 2, zSouthMid]}
        receiveShadow
        material={floorMat}
      >
        <boxGeometry args={[hw * 2, t, sl]} />
      </mesh>

      {/* West wall of south corridor (full run) */}
      <mesh
        name="CorridorSouthWallWest"
        position={[-hw - t / 2, h / 2 - t, zSouthMid]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[t, h, sl + t]} />
      </mesh>

      {/* East wall of south corridor — stops short so the east wing can open */}
      <mesh
        name="CorridorSouthWallEast"
        position={[hw + t / 2, h / 2 - t, ROOM.half + (sl - 1.55) / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[t, h, sl - 1.55]} />
      </mesh>

      {/* South end wall (with gap toward +X for the turn) */}
      <mesh
        name="CorridorSouthEndLeft"
        position={[-hw * 0.35, h / 2 - t, ROOM.half + sl + t / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[hw * 1.3, h, t]} />
      </mesh>
      <mesh
        name="CorridorSouthEndRight"
        position={[hw * 0.65 + t * 0.5, h / 2 - t, ROOM.half + sl + t / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[hw * 0.55, h, t]} />
      </mesh>

      {/* Ceiling over south leg */}
      <mesh
        name="CorridorSouthCeiling"
        position={[0, h, zSouthMid]}
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[hw * 2 - 0.02, t, sl - 0.02]} />
      </mesh>

      {/* East wing floor */}
      <mesh
        name="CorridorEastFloor"
        position={[eastFloorCx, -t / 2, zEastMid]}
        receiveShadow
        material={floorMat}
      >
        <boxGeometry args={[eastFloorLen, t, zEastHalf * 2]} />
      </mesh>

      {/* East wing north & south walls */}
      <mesh
        name="CorridorEastWallNorth"
        position={[eastFloorCx, h / 2 - t, zEastMid - zEastHalf - t / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[eastFloorLen + t, h, t]} />
      </mesh>
      <mesh
        name="CorridorEastWallSouth"
        position={[eastFloorCx, h / 2 - t, zEastMid + zEastHalf + t / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[eastFloorLen + t, h, t]} />
      </mesh>

      {/* East wing outer wall (+X) */}
      <mesh
        name="CorridorEastWallOuter"
        position={[ROOM.half + t / 2, h / 2 - t, zEastMid]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[t, h, zEastHalf * 2 + t * 2]} />
      </mesh>

      {/* Trim strip where south meets room */}
      <mesh position={[0, 0.12, ROOM.half - 0.02]} material={trimMat}>
        <boxGeometry args={[hw * 2 - 0.08, 0.2, 0.06]} />
      </mesh>

      {/* Ceiling over east wing */}
      <mesh
        name="CorridorEastCeiling"
        position={[eastFloorCx, h, zEastMid]}
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[eastFloorLen, t, zEastHalf * 2 - 0.02]} />
      </mesh>
    </group>
  )
}
