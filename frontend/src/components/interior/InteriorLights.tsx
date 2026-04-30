import { useMemo } from 'react'
import * as THREE from 'three'
import { CORRIDOR, CORRIDOR_GEOM, ROOM } from '@/lib/houseLayout'

const CEILING_Y = ROOM.height - 0.11

type LampProps = {
  position: [number, number, number]
  /** Point light intensity (scaled for interior) */
  intensity?: number
}

/** Smaller recessed can + warm point (for corridors / accents). */
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
        emissiveIntensity: 0.52,
        toneMapped: true,
        envMapIntensity: 0.55,
      }),
    [],
  )

  return (
    <group position={position}>
      <pointLight
        position={[0, -0.06, 0]}
        intensity={intensity * 1.08}
        distance={18}
        decay={2}
        color="#fff0e6"
      />
      <mesh position={[0, -0.04, 0]} receiveShadow material={shade}>
        <cylinderGeometry args={[0.26, 0.3, 0.1, 36]} />
      </mesh>
      <mesh position={[0, -0.13, 0]} material={bulb}>
        <sphereGeometry args={[0.12, 16, 12]} />
      </mesh>
    </group>
  )
}

/** Cross-lit accents: key toward seating + rim from picture wall (more depth than flat fill). */
function LivingFillSpots() {
  return (
    <group name="LivingFillSpots">
      <spotLight
        position={[0.35, 2.74, 2.2]}
        angle={0.48}
        penumbra={0.62}
        intensity={16}
        distance={16}
        decay={2}
        color="#fff4eb"
        castShadow
        shadow-bias={-0.0001}
        shadow-normalBias={0.03}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      >
        <object3D attach="target" position={[-2.05, 0.32, 0.25]} />
      </spotLight>
      <spotLight
        position={[-3.05, 2.68, -1.0]}
        angle={0.42}
        penumbra={0.55}
        intensity={9}
        distance={17}
        decay={2}
        color="#fff0e4"
        castShadow
        shadow-bias={-0.00008}
        shadow-normalBias={0.026}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      >
        <object3D attach="target" position={[1.2, 0.25, -2.2]} />
      </spotLight>
    </group>
  )
}

/** Used only with the procedural shell (room + corridors). Main ceiling fixtures come from house `furniture` with `mount: "ceiling"`. */
export function InteriorLights() {
  const { zSouthMid } = CORRIDOR_GEOM
  const { southLen: sl } = CORRIDOR
  const hallMidZ = ROOM.half + sl * 0.62

  return (
    <group name="InteriorLights">
      <CeilingLamp position={[0, CEILING_Y, zSouthMid]} intensity={16} />
      <CeilingLamp position={[0, CEILING_Y, hallMidZ]} intensity={14} />
      <LivingFillSpots />
    </group>
  )
}
