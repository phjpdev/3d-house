import { RoundedBox } from '@react-three/drei'
import type { InteriorShellMaterials } from '../types/interiorMaterials'
import { ROOM } from '../lib/houseLayout'

type Props = {
  materials: InteriorShellMaterials
  showBuiltInDesk: boolean
}

export function ProceduralRoom({ materials, showBuiltInDesk }: Props) {
  const { floor: floorMat, wall: wallMat, ceiling: ceilingMat, trim: trimMat, desk: deskMat } =
    materials

  const w = ROOM.half * 2 + ROOM.wallT * 2
  const h = ROOM.height
  /** Walls extend into the ceiling slab so there is no bright gap at the cornice */
  const WALL_EXT = 0.22
  const hWall = h + WALL_EXT
  const yWallCtr = hWall / 2 - ROOM.wallT

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
        position={[0, yWallCtr, -ROOM.half - ROOM.wallT / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[w, hWall, ROOM.wallT]} />
      </mesh>

      {/* South wall with door gap for future porch flow; collision still full box in v1 */}
      <mesh
        name="WallSouthLeft"
        position={[-2.2, yWallCtr, ROOM.half + ROOM.wallT / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[3.1, hWall, ROOM.wallT]} />
      </mesh>
      <mesh
        name="WallSouthRight"
        position={[2.2, yWallCtr, ROOM.half + ROOM.wallT / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[3.1, hWall, ROOM.wallT]} />
      </mesh>
      {/* Transom: span full door opening (1.3 m) plus overlap so top corners do not show sky */}
      <mesh
        name="WallSouthHeader"
        position={[0, h - 0.34, ROOM.half + ROOM.wallT / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[1.38, 0.74, ROOM.wallT]} />
      </mesh>

      <mesh
        name="WallEast"
        position={[ROOM.half + ROOM.wallT / 2, yWallCtr, 0]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[ROOM.wallT, hWall, w]} />
      </mesh>

      <mesh
        name="WallWest"
        position={[-ROOM.half - ROOM.wallT / 2, yWallCtr, 0]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[ROOM.wallT, hWall, w]} />
      </mesh>

      <mesh
        name="Ceiling"
        position={[0, h, 0]}
        receiveShadow
        material={ceilingMat}
      >
        <boxGeometry args={[w - 0.02, ROOM.wallT, w - 0.02]} />
      </mesh>

      {showBuiltInDesk ? (
        <group name="Desk" position={[2.35, 0, -0.9]}>
          <RoundedBox
            args={[0.92, 0.68, 0.5]}
            radius={0.022}
            smoothness={3}
            position={[0, 0.34, 0]}
            castShadow
            receiveShadow
            material={deskMat}
          />
          <RoundedBox
            args={[1.12, 0.055, 0.72]}
            radius={0.015}
            smoothness={2}
            position={[0, 0.705, 0]}
            castShadow
            receiveShadow
            material={deskMat}
          />
        </group>
      ) : null}

      {/* Baseboards */}
      <mesh position={[0, 0.12, -ROOM.half + 0.06]} material={trimMat}>
        <boxGeometry args={[ROOM.half * 2 - 0.1, 0.22, 0.08]} />
      </mesh>
    </group>
  )
}
