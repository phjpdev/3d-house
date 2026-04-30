import type { InteriorShellMaterials } from '@/types/interiorMaterials'
import { CORRIDOR, CORRIDOR_GEOM, ROOM } from '@/lib/houseLayout'

const h = ROOM.height
const t = ROOM.wallT
const WALL_EXT = 0.22
const hWall = h + WALL_EXT
const yWall = hWall / 2 - t

const { zSouthMid, southLen: sl } = CORRIDOR_GEOM
const hw = CORRIDOR.halfW
const EPS = 0.03

type Props = {
  materials: InteriorShellMaterials
}

/**
 * One straight south corridor (no L-turn) — single floor run with continuous side walls.
 */
export function Corridors({ materials }: Props) {
  const floorMat = materials.floor
  const wallMat = materials.wall
  const ceilingMat = materials.ceiling
  const trimMat = materials.trim

  const zSouthFloor = ROOM.half + sl / 2
  const zCeilSouthMid = ROOM.half + sl / 2 - 0.04
  const ceilSouthDepth = sl + 0.14
  const ceilSouthW = hw * 2 + 0.08

  return (
    <group name="Corridors">
      <mesh name="CorridorSouthFloor" position={[0, -t / 2, zSouthFloor]} receiveShadow material={floorMat}>
        <boxGeometry args={[hw * 2, t, sl]} />
      </mesh>

      <mesh
        name="CorridorSouthWallWest"
        position={[-hw - t / 2, yWall, zSouthMid]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[t, hWall, sl + t + EPS]} />
      </mesh>

      <mesh
        name="CorridorSouthWallEast"
        position={[hw + t / 2, yWall, zSouthMid]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[t, hWall, sl + t + EPS]} />
      </mesh>

      <mesh
        name="CorridorSouthEnd"
        position={[0, yWall, ROOM.half + sl + t / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[hw * 2 + t * 2 + EPS * 2, hWall, t + EPS]} />
      </mesh>

      <mesh name="CorridorSouthCeiling" position={[0, h, zCeilSouthMid]} material={ceilingMat}>
        <boxGeometry args={[ceilSouthW, t, ceilSouthDepth]} />
      </mesh>

      <mesh position={[0, 0.035, ROOM.half + 0.005]} material={trimMat}>
        <boxGeometry args={[hw * 2 + 0.06, 0.035, 0.05]} />
      </mesh>
    </group>
  )
}
