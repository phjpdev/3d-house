'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { configureRenderer } from '@/lib/configureRenderer'
import { SceneContents } from '@/components/canvas/SceneContents'
import { useVividHomeStore } from '@/store/vividHomeStore'

type Props = {
  mode: 'edit' | 'visit'
  className?: string
}

/** Stable camera props — recreating the camera each render resets visit-mode rigs. */
const CAM = { fov: 52, near: 0.08, far: 90 } as const

export function VividHomeExperience({ mode, className }: Props) {
  const clearFurnitureSelection = useVividHomeStore((s) => s.setSelectedPlacedId)
  const clearWallSelection = useVividHomeStore((s) => s.setSelectedWallPictureId)
  const libraryPlacementPending = useVividHomeStore((s) => s.libraryPlacementPending)
  const wallArtPlacementPending = useVividHomeStore((s) => s.wallArtPlacementPending)
  const placementCursor =
    mode === 'edit' && (libraryPlacementPending || wallArtPlacementPending)

  return (
    <div
      className={[
        'h-full w-full',
        placementCursor ? 'cursor-crosshair' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Canvas
        className="block h-full w-full touch-none"
        style={{ width: '100%', height: '100%' }}
        shadows
        dpr={[1, 1.5]}
        camera={CAM}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => configureRenderer(gl)}
        onPointerMissed={() => {
          if (libraryPlacementPending || wallArtPlacementPending) return
          clearFurnitureSelection(null)
          clearWallSelection(null)
        }}
      >
        <Suspense fallback={null}>
          <SceneContents mode={mode} />
        </Suspense>
      </Canvas>
    </div>
  )
}
