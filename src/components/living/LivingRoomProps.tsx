import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { ROOM } from '../../lib/houseLayout'

/** Inner wall planes (meters), small epsilon from collision shell. */
const eastInnerX = ROOM.half - 0.02

/** Credenza half-depth (m) — flush to east inner wall. */
const CRED_DEPTH = 0.21

/**
 * Fixed living-room props for the procedural shell: TV wall unit + split AC.
 * Sofa and desk chair load from `house.furniture` GLBs (see `public/houses/*.json`).
 */
export function LivingRoomProps() {
  const credenzaBody = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#4a3d34',
        roughness: 0.62,
        metalness: 0.06,
        clearcoat: 0.18,
        clearcoatRoughness: 0.55,
        envMapIntensity: 0.42,
      }),
    [],
  )
  const credenzaTop = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#5c4a3e',
        roughness: 0.55,
        metalness: 0.08,
        clearcoat: 0.22,
        clearcoatRoughness: 0.48,
        envMapIntensity: 0.45,
      }),
    [],
  )
  const legMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2a221c',
        roughness: 0.78,
        metalness: 0.04,
        envMapIntensity: 0.32,
      }),
    [],
  )
  const handleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8a8580',
        roughness: 0.35,
        metalness: 0.75,
        envMapIntensity: 0.55,
      }),
    [],
  )
  const drawerInset = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3f342c',
        roughness: 0.88,
        metalness: 0.02,
        envMapIntensity: 0.28,
      }),
    [],
  )
  const openShelfDark = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a1512',
        roughness: 0.95,
        metalness: 0,
        envMapIntensity: 0.12,
      }),
    [],
  )
  const tvBezel = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#0a0a0c',
        roughness: 0.42,
        metalness: 0.55,
        clearcoat: 0.35,
        clearcoatRoughness: 0.35,
        envMapIntensity: 0.6,
      }),
    [],
  )
  const tvScreen = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#050a14',
        emissive: '#1e4070',
        emissiveIntensity: 0.28,
        roughness: 0.22,
        metalness: 0.2,
        toneMapped: true,
      }),
    [],
  )
  const tvPedestal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1c1c1f',
        roughness: 0.55,
        metalness: 0.4,
        envMapIntensity: 0.5,
      }),
    [],
  )
  const acPlastic = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#f4f2ee',
        roughness: 0.38,
        metalness: 0.08,
        clearcoat: 0.08,
        clearcoatRoughness: 0.45,
        envMapIntensity: 0.35,
      }),
    [],
  )
  const acGrille = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e8e6e2',
        roughness: 0.55,
        metalness: 0.12,
        envMapIntensity: 0.32,
      }),
    [],
  )

  /** Group origin: credenza back flush east wall; local +Z = into room. */
  const tvGroupX = eastInnerX - 0.03 - CRED_DEPTH

  const legH = 0.31
  const legY = legH / 2
  const carcassH = 0.36
  const carcassY = legH + carcassH / 2
  const topT = 0.038
  const topY = legH + carcassH + topT / 2
  const pedestalH = 0.055
  const pedestalY = topY + topT / 2 + pedestalH / 2
  const tvCenterY = pedestalY + pedestalH / 2 + 0.36

  const legXZ: [number, number][] = [
    [-0.56, -0.14],
    [0.56, -0.14],
    [-0.56, 0.14],
    [0.56, 0.14],
  ]

  return (
    <group name="LivingRoomProps">
      <group name="TvWall" position={[tvGroupX, 0, 0.6]} rotation={[0, -Math.PI / 2, 0]}>
        {/* —— Credenza: legs + carcass + drawer read + overhang top —— */}
        <group name="Credenza">
          {legXZ.map(([lx, lz], i) => (
            <mesh
              key={i}
              position={[lx, legY, lz]}
              castShadow
              receiveShadow
              material={legMat}
            >
              <cylinderGeometry args={[0.024, 0.02, legH, 14]} />
            </mesh>
          ))}
          <RoundedBox
            args={[1.32, carcassH, 0.36]}
            radius={0.014}
            smoothness={3}
            position={[0, carcassY, 0]}
            castShadow
            receiveShadow
            material={credenzaBody}
          />
          {/* Vertical split + proud drawer fronts */}
          <mesh position={[0, carcassY, 0.182]} castShadow receiveShadow material={drawerInset}>
            <boxGeometry args={[0.006, 0.28, 0.008]} />
          </mesh>
          <RoundedBox
            args={[0.58, 0.26, 0.012]}
            radius={0.006}
            smoothness={2}
            position={[-0.36, carcassY, 0.188]}
            castShadow
            receiveShadow
            material={credenzaBody}
          />
          <RoundedBox
            args={[0.58, 0.26, 0.012]}
            radius={0.006}
            smoothness={2}
            position={[0.36, carcassY, 0.188]}
            castShadow
            receiveShadow
            material={credenzaBody}
          />
          <mesh position={[-0.36, carcassY, 0.196]} castShadow material={handleMat}>
            <cylinderGeometry args={[0.008, 0.008, 0.018, 12]} />
          </mesh>
          <mesh position={[0.36, carcassY, 0.196]} castShadow material={handleMat}>
            <cylinderGeometry args={[0.008, 0.008, 0.018, 12]} />
          </mesh>
          {/* Open center shelf (recessed black) */}
          <mesh position={[0, carcassY - 0.02, 0.175]} receiveShadow material={openShelfDark}>
            <boxGeometry args={[0.34, 0.22, 0.22]} />
          </mesh>
          <RoundedBox
            args={[1.48, topT, 0.42]}
            radius={0.012}
            smoothness={3}
            position={[0, topY, 0]}
            castShadow
            receiveShadow
            material={credenzaTop}
          />
        </group>

        {/* TV pedestal feet on credenza */}
        <RoundedBox
          args={[0.14, pedestalH, 0.06]}
          radius={0.012}
          smoothness={2}
          position={[-0.28, pedestalY, 0.04]}
          castShadow
          receiveShadow
          material={tvPedestal}
        />
        <RoundedBox
          args={[0.14, pedestalH, 0.06]}
          radius={0.012}
          smoothness={2}
          position={[0.28, pedestalY, 0.04]}
          castShadow
          receiveShadow
          material={tvPedestal}
        />

        {/* Thin panel TV + slim bezel */}
        <RoundedBox
          args={[1.12, 0.64, 0.012]}
          radius={0.004}
          smoothness={2}
          position={[0, tvCenterY, 0.02]}
          castShadow
          receiveShadow
          material={tvBezel}
        />
        <mesh position={[0, tvCenterY, 0.032]} castShadow material={tvScreen}>
          <planeGeometry args={[1.02, 0.56]} />
        </mesh>
        <mesh position={[0, tvCenterY - 0.34, 0.015]} castShadow receiveShadow material={tvPedestal}>
          <boxGeometry args={[1.08, 0.04, 0.028]} />
        </mesh>
        <pointLight
          position={[0, tvCenterY, 0.48]}
          intensity={1.25}
          distance={3.4}
          decay={2}
          color="#d0e4ff"
        />
      </group>

      <group name="AirConditioner" position={[eastInnerX - 0.1, 2.4, -1.32]} rotation={[0, -Math.PI / 2, 0]}>
        <RoundedBox
          args={[0.92, 0.26, 0.22]}
          radius={0.018}
          smoothness={2}
          position={[0, 0, 0]}
          castShadow
          receiveShadow
          material={acPlastic}
        />
        <group position={[0, -0.02, 0.112]}>
          {Array.from({ length: 14 }).map((_, i) => (
            <mesh
              key={i}
              position={[(i - 6.5) * 0.062, 0, 0]}
              castShadow
              receiveShadow
              material={acGrille}
            >
              <boxGeometry args={[0.055, 0.018, 0.006]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}
