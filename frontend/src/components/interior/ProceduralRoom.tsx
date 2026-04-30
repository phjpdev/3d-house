import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { InteriorShellMaterials } from '@/types/interiorMaterials'
import { ROOM } from '@/lib/houseLayout'

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

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        transmission: 0.92,
        thickness: 0.05,
        roughness: 0.06,
        metalness: 0.05,
        transparent: true,
        envMapIntensity: 1.15,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
      }),
    [],
  )

  /** Window opening + garden backdrop — sells daylight without rebuilding collision volumes (still closed shell). */
  const WIN_W = 2.85
  const WIN_H = 1.52
  const winBottom = 0.86
  const winTop = winBottom + WIN_H
  const wallBottom = yWallCtr - hWall / 2
  const wallTop = yWallCtr + hWall / 2
  const pierW = (w - WIN_W) / 2
  const leftX = -w / 2 + pierW / 2
  const rightX = w / 2 - pierW / 2
  const zWall = -ROOM.half - ROOM.wallT / 2
  const sillH = Math.max(0.08, winBottom - wallBottom)
  const sillY = wallBottom + sillH / 2
  const lintelH = Math.max(0.08, wallTop - winTop)
  const lintelY = winTop + lintelH / 2
  const gardenZ = -ROOM.half - 10

  return (
    <group name="ProceduralRoom">
      {/* Exterior read — grass + simplified silhouettes (cheap depth cue beyond glass). */}
      {/* Slightly below y=0 so the huge garden plane does not Z-fight with the interior floor slab top. */}
      <group position={[0, -0.06, gardenZ]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow name="GardenGround">
          <planeGeometry args={[48, 36]} />
          <meshStandardMaterial color="#33553d" roughness={0.94} metalness={0} envMapIntensity={0.28} />
        </mesh>
        {[
          [-5.2, 0, 1.2, 1.1],
          [1.4, 0, 2.2, 0.85],
          [5.5, 0, 0.3, 0.95],
        ].map(([tx, ty, tz, sc], i) => (
          <group key={i} position={[tx, ty, tz]}>
            <mesh castShadow position={[0, sc * 1.45, 0]}>
              <cylinderGeometry args={[sc * 0.35, sc * 0.42, sc * 2.9, 9]} />
              <meshStandardMaterial color="#2a382e" roughness={0.91} metalness={0} envMapIntensity={0.35} />
            </mesh>
          </group>
        ))}
      </group>

      <mesh
        name="Floor"
        position={[0, -ROOM.wallT / 2, 0]}
        receiveShadow
        material={floorMat}
      >
        <boxGeometry args={[w, ROOM.wallT, w]} />
      </mesh>

      {/* North wall — segmented for panoramic glass toward garden */}
      <mesh
        name="WallNorthLeft"
        position={[leftX, yWallCtr, zWall]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[pierW, hWall, ROOM.wallT]} />
      </mesh>
      <mesh
        name="WallNorthRight"
        position={[rightX, yWallCtr, zWall]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[pierW, hWall, ROOM.wallT]} />
      </mesh>
      <mesh
        name="WallNorthSill"
        position={[0, sillY, zWall]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[WIN_W, sillH, ROOM.wallT]} />
      </mesh>
      <mesh
        name="WallNorthLint"
        position={[0, lintelY, zWall]}
        castShadow
        receiveShadow
        material={wallMat}
      >
        <boxGeometry args={[WIN_W, lintelH, ROOM.wallT]} />
      </mesh>

      <mesh
        name="NorthGlass"
        position={[0, winBottom + WIN_H / 2, -ROOM.half + 0.045]}
        rotation={[0, 0, 0]}
        material={glassMat}
      >
        <planeGeometry args={[WIN_W - 0.12, WIN_H - 0.1]} />
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
