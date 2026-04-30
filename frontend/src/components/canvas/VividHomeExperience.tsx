'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { configureRenderer } from '@/lib/configureRenderer'
import { SceneContents } from '@/components/canvas/SceneContents'
import { useVividHomeStore } from '@/store/vividHomeStore'

type Props = {
  mode: 'edit' | 'visit'
}

/** Stable camera props — recreating the camera each render resets visit-mode rigs. */
const CAM = { fov: 52, near: 0.08, far: 90 } as const

export function VividHomeExperience({ mode }: Props) {
  const clearSelection = useVividHomeStore((s) => s.setSelectedPlacedId)

  return (
    <Canvas
      key={mode}
      shadows
      dpr={[1, 2]}
      camera={CAM}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => configureRenderer(gl)}
      onPointerMissed={() => clearSelection(null)}
    >
      <Suspense fallback={null}>
        <SceneContents mode={mode} />
      </Suspense>
    </Canvas>
  )
}
