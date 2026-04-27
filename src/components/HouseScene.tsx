import { Suspense } from 'react'
import * as THREE from 'three'
import type { HouseConfig } from '../types/house'
import { Corridors } from './Corridors'
import { ExhibitMesh } from './ExhibitMesh'
import { FirstPersonRig, KeyboardTracker } from './FirstPersonRig'
import { GltfRoom } from './GltfRoom'
import { ProceduralRoom } from './ProceduralRoom'

type Props = {
  house: HouseConfig
  onOpenExhibit: (id: string) => void
  pointerLookEnabled: boolean
}

export function HouseScene({ house, onOpenExhibit, pointerLookEnabled }: Props) {
  return (
    <>
      <KeyboardTracker />
      <color attach="background" args={['#b8c4d4']} />
      <fog attach="fog" args={['#b8c4d4', 14, 42]} />

      <hemisphereLight args={['#f2efe8', '#6b7a8c', 0.55]} />
      <directionalLight castShadow intensity={0.92} position={[5.2, 9.5, 4.2]} />

      <FirstPersonRig spawn={house.spawn} lookEnabled={pointerLookEnabled} />

      {house.roomGltfUrl ? (
        <Suspense fallback={null}>
          <GltfRoom url={house.roomGltfUrl} />
        </Suspense>
      ) : (
        <>
          <ProceduralRoom />
          <Corridors />
        </>
      )}

      {house.exhibits.map((ex) => (
        <ExhibitMesh key={ex.id} exhibit={ex} onOpen={onOpenExhibit} />
      ))}
    </>
  )
}

export function configureRenderer(gl: THREE.WebGLRenderer) {
  gl.shadowMap.enabled = true
  gl.shadowMap.type = THREE.PCFSoftShadowMap
  gl.toneMapping = THREE.ACESFilmicToneMapping
  gl.toneMappingExposure = 0.95
}
