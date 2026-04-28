import { Suspense } from 'react'
import * as THREE from 'three'
import type { HouseConfig } from '../types/house'
import { Corridors } from './Corridors'
import { ExhibitMesh } from './ExhibitMesh'
import { FirstPersonRig, KeyboardTracker } from './FirstPersonRig'
import { GltfRoom } from './GltfRoom'
import { InteriorLights } from './InteriorLights'
import { ProceduralRoom } from './ProceduralRoom'
import { SunLight } from './SunLight'

type Props = {
  house: HouseConfig
  onOpenExhibit: (id: string) => void
  pointerLookEnabled: boolean
}

export function HouseScene({ house, onOpenExhibit, pointerLookEnabled }: Props) {
  return (
    <>
      <KeyboardTracker />
      <color attach="background" args={['#c5d0dc']} />
      <fog attach="fog" args={['#c5d0dc', 16, 48]} />

      <hemisphereLight args={['#f9f6f0', '#8a96a8', 0.3]} />
      <ambientLight intensity={0.09} />
      <SunLight />

      <FirstPersonRig spawn={house.spawn} lookEnabled={pointerLookEnabled} />

      {house.roomGltfUrl ? (
        <Suspense fallback={null}>
          <GltfRoom url={house.roomGltfUrl} />
        </Suspense>
      ) : (
        <>
          <ProceduralRoom />
          <Corridors />
          <InteriorLights />
        </>
      )}

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

export function configureRenderer(gl: THREE.WebGLRenderer) {
  gl.shadowMap.enabled = true
  gl.shadowMap.type = THREE.PCFSoftShadowMap
  gl.toneMapping = THREE.ACESFilmicToneMapping
  gl.toneMappingExposure = 1.05
}
