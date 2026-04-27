import { useMemo } from 'react'
import * as THREE from 'three'
import { CORRIDOR, CORRIDOR_GEOM, ROOM } from '../lib/houseLayout'

const wallColor = '#e6e2d8'
const floorColor = '#b8ae9c'
const trimColor = '#5c4f42'
/** Slightly lighter than walls — reads as painted ceiling */
const ceilingColor = '#ebe7df'

const h = ROOM.height
const t = ROOM.wallT
const { zSouthMid, eastFloorLen, zEastHalf, zEastMid, eastFloorCx } = CORRIDOR_GEOM
const sl = CORRIDOR.southLen
const hw = CORRIDOR.halfW

const EPS = 0.03
const yWall = h / 2 - t

/**
 * L-shaped corridors with overlapping joins (no hairline cracks) and ceilings
 * that tuck under the main room ceiling at the door.
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
        roughness: 0.9,
        metalness: 0.0,
      }),
    [],
  )
  const ceilingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ceilingColor,
        roughness: 0.82,
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

  /* --- South leg (along +Z) --- */
  const zSouthFloor = ROOM.half + sl / 2
  const zSouthEnd = ROOM.half + sl
  const zLoOpen = zEastMid - zEastHalf - EPS
  const zHiOpen = Math.min(zEastMid + zEastHalf + EPS, zSouthEnd - 0.02)
  const zEastWall1Mid = ROOM.half + (zLoOpen - ROOM.half) / 2
  const dEastWall1 = Math.max(0.15, zLoOpen - ROOM.half + EPS)
  const eastUpperDepth = Math.max(0, zSouthEnd - zHiOpen - 0.02)
  const zEastWall2Mid = zHiOpen + eastUpperDepth / 2

  /* Ceilings: extend slightly north under the main ceiling + overlap each other at the bend */
  const zCeilSouthMid = ROOM.half + sl / 2 - 0.04
  const ceilSouthDepth = sl + 0.14
  const ceilSouthW = hw * 2 + 0.08

  const ceilEastW = eastFloorLen + 0.1
  const ceilEastD = zEastHalf * 2 + 0.1

  return (
    <group name="Corridors">
      {/* South floor */}
      <mesh name="CorridorSouthFloor" position={[0, -t / 2, zSouthFloor]} receiveShadow material={floorMat}>
        <boxGeometry args={[hw * 2, t, sl]} />
      </mesh>

      {/* West wall — full run, slight +Z overlap into end wall */}
      <mesh
        name="CorridorSouthWallWest"
        position={[-hw - t / 2, yWall, zSouthMid]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[t, h, sl + t + EPS]} />
      </mesh>

      {/* East wall — lower segment (before east opening) */}
      <mesh
        name="CorridorSouthWallEastLower"
        position={[hw + t / 2, yWall, zEastWall1Mid]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[t, h, Math.max(0.12, dEastWall1)]} />
      </mesh>

      {/* East wall — upper segment (only if there is solid past the east opening) */}
      {eastUpperDepth > 0.09 ? (
        <mesh
          name="CorridorSouthWallEastUpper"
          position={[hw + t / 2, yWall, zEastWall2Mid]}
          castShadow
          receiveShadow
          material={wallMat}
        >
          <boxGeometry args={[t, h, eastUpperDepth]} />
        </mesh>
      ) : null}

      {/* End wall — two slabs with overlapping inner edges around the east turn */}
      <mesh
        name="CorridorSouthEndLeft"
        position={[-hw * 0.32 - EPS / 2, yWall, ROOM.half + sl + t / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[hw * 1.35 + EPS, h, t + EPS]} />
      </mesh>
      <mesh
        name="CorridorSouthEndRight"
        position={[hw * 0.62 + t * 0.5, yWall, ROOM.half + sl + t / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[hw * 0.62 + EPS, h, t + EPS]} />
      </mesh>

      {/* South ceiling — overlaps main room ceiling edge + east ceiling */}
      <mesh
        name="CorridorSouthCeiling"
        position={[0, h, zCeilSouthMid]}
        receiveShadow
        material={ceilingMat}
      >
        <boxGeometry args={[ceilSouthW, t, ceilSouthDepth]} />
      </mesh>

      {/* East wing floor — flush with south floor */}
      <mesh
        name="CorridorEastFloor"
        position={[eastFloorCx, -t / 2, zEastMid]}
        receiveShadow
        material={floorMat}
      >
        <boxGeometry args={[eastFloorLen + EPS * 2, t, zEastHalf * 2 + EPS * 2]} />
      </mesh>

      {/* East wing north / south walls — extend into south leg slightly */}
      <mesh
        name="CorridorEastWallNorth"
        position={[eastFloorCx, yWall, zEastMid - zEastHalf - t / 2 - EPS / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[eastFloorLen + t + EPS * 2, h, t + EPS]} />
      </mesh>
      <mesh
        name="CorridorEastWallSouth"
        position={[eastFloorCx, yWall, zEastMid + zEastHalf + t / 2 + EPS / 2]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[eastFloorLen + t + EPS * 2, h, t + EPS]} />
      </mesh>

      {/* East outer wall — flush with main east wall plane */}
      <mesh
        name="CorridorEastWallOuter"
        position={[ROOM.half + t / 2, yWall, zEastMid]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[t + EPS, h, zEastHalf * 2 + t * 2 + EPS * 2]} />
      </mesh>

      {/* East ceiling — overlaps south ceiling at the bend */}
      <mesh
        name="CorridorEastCeiling"
        position={[eastFloorCx, h, zEastMid]}
        receiveShadow
        material={ceilingMat}
      >
        <boxGeometry args={[ceilEastW, t, ceilEastD]} />
      </mesh>

      {/* Door threshold trim */}
      <mesh position={[0, 0.12, ROOM.half - 0.01]} material={trimMat}>
        <boxGeometry args={[hw * 2 + 0.04, 0.2, 0.08]} />
      </mesh>
    </group>
  )
}
