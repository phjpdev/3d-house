import { Canvas } from '@react-three/fiber'
import type { HouseConfig } from '../types/house'
import { configureRenderer, HouseScene } from './HouseScene'

type Props = {
  house: HouseConfig
  onOpenExhibit: (id: string) => void
  pointerLookEnabled: boolean
}

/** Stable reference — inline `camera={{}}` on each render resets R3F default camera and breaks FPS rig. */
/** Slightly narrower FOV reads closer to a phone / wide photo of a real room. */
const CANVAS_CAMERA = { fov: 52, near: 0.08, far: 60 } as const

export function HouseCanvas({ house, onOpenExhibit, pointerLookEnabled }: Props) {
  return (
    <Canvas
      key={house.id}
      shadows
      dpr={[1, 2]}
      camera={CANVAS_CAMERA}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => configureRenderer(gl)}
    >
      <HouseScene
        house={house}
        onOpenExhibit={onOpenExhibit}
        pointerLookEnabled={pointerLookEnabled}
      />
    </Canvas>
  )
}
