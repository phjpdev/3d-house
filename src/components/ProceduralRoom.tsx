import { useMemo } from 'react'
import * as THREE from 'three'

const wallColor = '#e8e4dc'
const floorColor = '#c4b8a5'
const trimColor = '#6b5b4d'

/** Inner walkable half-extents (meters), matching FirstPerson collision */
export const ROOM = {
  half: 3.75 as const,
  wallT: 0.14 as const,
  height: 3.05 as const,
}

export function ProceduralRoom() {
  const floorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: floorColor,
        roughness: 0.92,
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

  const w = ROOM.half * 2 + ROOM.wallT * 2
  const h = ROOM.height

  return (
    <group name="ProceduralRoom">
      <mesh
        name="Floor"
        position={[0, -ROOM.wallT / 2, 0]}
        receiveShadow
        material={floorMat}
      >
        <boxGeometry args={[w, ROOM.wallT, w]} />
      </mesh>

      {/* North wall (+Z in our exhibit positions use -Z face — inner face at z = -ROOM.half) */}
      <mesh
        name="WallNorth"
        position={[0, h / 2 - ROOM.wallT, -ROOM.half - ROOM.wallT / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[w, h, ROOM.wallT]} />
      </mesh>

      {/* South wall with door gap for future porch flow; collision still full box in v1 */}
      <mesh
        name="WallSouthLeft"
        position={[-2.2, h / 2 - ROOM.wallT, ROOM.half + ROOM.wallT / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[3.1, h, ROOM.wallT]} />
      </mesh>
      <mesh
        name="WallSouthRight"
        position={[2.2, h / 2 - ROOM.wallT, ROOM.half + ROOM.wallT / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[3.1, h, ROOM.wallT]} />
      </mesh>
      <mesh
        name="WallSouthHeader"
        position={[0, h - 0.35, ROOM.half + ROOM.wallT / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[1.2, 0.7, ROOM.wallT]} />
      </mesh>

      <mesh
        name="WallEast"
        position={[ROOM.half + ROOM.wallT / 2, h / 2 - ROOM.wallT, 0]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[ROOM.wallT, h, w]} />
      </mesh>

      <mesh
        name="WallWest"
        position={[-ROOM.half - ROOM.wallT / 2, h / 2 - ROOM.wallT, 0]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[ROOM.wallT, h, w]} />
      </mesh>

      <mesh
        name="Ceiling"
        position={[0, h, 0]}
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[w - 0.02, ROOM.wallT, w - 0.02]} />
      </mesh>

      {/* Simple desk: thick top + legs as one block for silhouette */}
      <mesh
        name="Desk"
        position={[2.35, 0.38, -0.9]}
        castShadow
        receiveShadow
        material={trimMat}
      >
        <boxGeometry args={[1.15, 0.74, 0.65]} />
      </mesh>
      <mesh position={[2.35, 0.78, -0.9]} castShadow material={trimMat}>
        <boxGeometry args={[1.25, 0.06, 0.75]} />
      </mesh>

      {/* Baseboards */}
      <mesh position={[0, 0.12, -ROOM.half + 0.06]} material={trimMat}>
        <boxGeometry args={[ROOM.half * 2 - 0.1, 0.22, 0.08]} />
      </mesh>
    </group>
  )
}
