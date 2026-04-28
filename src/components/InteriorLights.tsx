import { useMemo } from 'react'
import * as THREE from 'three'
import { CORRIDOR_GEOM, ROOM } from '../lib/houseLayout'

const CEILING_Y = ROOM.height - 0.11

type LampProps = {
  position: [number, number, number]
  /** Point light intensity (scaled for interior) */
  intensity?: number
}

/**
 * Simple flush ceiling fixture + warm point fill (typical residential downlight feel).
 */
function CeilingLamp({ position, intensity = 22 }: LampProps) {
  const shade = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ece8e0',
        roughness: 0.45,
        metalness: 0.15,
        envMapIntensity: 0.35,
        emissive: '#fff3e0',
        emissiveIntensity: 0.06,
      }),
    [],
  )
  const bulb = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fffff5',
        emissive: '#ffe8c8',
        emissiveIntensity: 0.38,
        toneMapped: true,
        envMapIntensity: 0.5,
      }),
    [],
  )

  return (
    <group position={position}>
      <pointLight
        position={[0, -0.06, 0]}
        intensity={intensity}
        distance={16}
        decay={2}
        color="#ffeedd"
      />
      <mesh position={[0, -0.04, 0]} receiveShadow material={shade}>
        <cylinderGeometry args={[0.2, 0.24, 0.09, 32]} />
      </mesh>
      <mesh position={[0, -0.12, 0]} material={bulb}>
        <sphereGeometry args={[0.11, 16, 12]} />
      </mesh>
    </group>
  )
}

/** Used only with the procedural shell (room + corridors). */
export function InteriorLights() {
  const { zSouthMid, eastFloorCx, zEastMid } = CORRIDOR_GEOM

  return (
    <group name="InteriorLights">
      <CeilingLamp position={[0, CEILING_Y, 0]} intensity={20} />
      <CeilingLamp position={[0, CEILING_Y, zSouthMid]} intensity={14} />
      <CeilingLamp position={[eastFloorCx, CEILING_Y, zEastMid]} intensity={12} />
    </group>
  )
}
