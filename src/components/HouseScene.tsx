import { useEffect, Suspense } from 'react'
import { ContactShadows, Environment, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'
import type { HouseConfig } from '../types/house'
import { ExhibitMesh } from './ExhibitMesh'
import { FirstPersonRig, KeyboardTracker } from './FirstPersonRig'
import { FurnitureMesh } from './FurnitureMesh'
import { GltfRoom } from './GltfRoom'
import { InteriorShell } from './InteriorShell'
import { SunLight } from './SunLight'

/** Matches wall/floor warmth so fog reads as interior haze, not outdoor sky. */
const INTERIOR_BG = '#ddd6cc'

type Props = {
  house: HouseConfig
  onOpenExhibit: (id: string) => void
  pointerLookEnabled: boolean
}

export function HouseScene({ house, onOpenExhibit, pointerLookEnabled }: Props) {
  useEffect(() => {
    for (const f of house.furniture ?? []) {
      useGLTF.preload(f.url)
    }
  }, [house.furniture])

  return (
    <>
      <KeyboardTracker />
      {/* drei SoftShadows disposes every scene material on mount — breaks memoized materials → blank scene */}
      <color attach="background" args={[INTERIOR_BG]} />
      <fog attach="fog" args={[INTERIOR_BG, 18, 52]} />

      <Suspense fallback={null}>
        <Environment preset="apartment" environmentIntensity={0.58} />
      </Suspense>

      <hemisphereLight args={['#fff8f0', '#b8aea2', 0.38]} />
      <ambientLight intensity={0.028} color="#f0e8df" />
      <SunLight />

      <FirstPersonRig spawn={house.spawn} lookEnabled={pointerLookEnabled} />

      {house.roomGltfUrl ? (
        <Suspense fallback={null}>
          <GltfRoom url={house.roomGltfUrl} />
          {house.furniture?.map((item) => (
            <FurnitureMesh key={`${item.id}:${item.url}`} item={item} />
          ))}
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <InteriorShell house={house} />
        </Suspense>
      )}

      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.44}
        scale={22}
        blur={2.1}
        far={9}
        color="#14100c"
      />

      {house.exhibits.map((ex) => (
        <ExhibitMesh
          key={ex.id}
          exhibit={ex}
          onOpen={onOpenExhibit}
          pointerLookEnabled={pointerLookEnabled}
        />
      ))}
    </>
  )
}

let rectAreaLightLibReady = false

export function configureRenderer(gl: THREE.WebGLRenderer) {
  if (!rectAreaLightLibReady) {
    RectAreaLightUniformsLib.init()
    rectAreaLightLibReady = true
  }
  gl.shadowMap.enabled = true
  gl.shadowMap.type = THREE.PCFSoftShadowMap
  gl.outputColorSpace = THREE.SRGBColorSpace
  gl.toneMapping = THREE.ACESFilmicToneMapping
  gl.toneMappingExposure = 0.96
}
