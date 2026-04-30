'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  ContactShadows,
  Environment,
  OrbitControls,
  TransformControls,
  useGLTF,
} from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { TransformControls as TransformControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import type { HouseConfig } from '@/types/house'
import demoHouse from '@/data/demo-house.json'
import { InteriorShell } from '@/components/interior/InteriorShell'
import { SunLight } from '@/components/interior/SunLight'
import { ExhibitMesh } from '@/components/interior/ExhibitMesh'
import { FurnitureMesh } from '@/components/interior/FurnitureMesh'
import { placedToFurniture } from '@/lib/toFurnitureConfig'
import { mergeWallPictures } from '@/lib/mergeExhibits'
import { isMeshySignedAssetUrl } from '@/lib/meshyAssets'
import { useVividHomeStore } from '@/store/vividHomeStore'
import { VisitWalkRig } from '@/components/canvas/VisitWalkRig'
import { RealisticEffects } from '@/components/canvas/RealisticEffects'
import type { PlacedFurniture } from '@/store/vividHomeStore'

const HDRI =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/brown_photostudio_06_1k.hdr'

const INTERIOR_BG = '#ddd6cc'

type Props = {
  mode: 'edit' | 'visit'
}

function syncPlacedFromGroup(
  g: THREE.Group,
  item: PlacedFurniture,
  upsert: (p: PlacedFurniture) => void,
) {
  const p = g.position
  const r = g.rotation
  const s = g.scale.x
  upsert({
    ...item,
    position: [p.x, p.y, p.z],
    rotation: [r.x, r.y, r.z],
    scale: s,
  })
}

export function SceneContents({ mode }: Props) {
  const house = demoHouse as unknown as HouseConfig
  const placed = useVividHomeStore((s) => s.placedFurniture)
  const wallPictures = useVividHomeStore((s) => s.wallPictures)
  const selectedId = useVividHomeStore((s) => s.selectedPlacedId)
  const setSelected = useVividHomeStore((s) => s.setSelectedPlacedId)
  const upsert = useVividHomeStore((s) => s.upsertPlaced)
  const visitOrbit = useVividHomeStore((s) => s.visitUseOrbit)

  const objectRefs = useRef<Map<string, THREE.Group>>(new Map())
  const [transformTarget, setTransformTarget] = useState<THREE.Group | null>(null)
  const editOrbitRef = useRef<OrbitControlsImpl | null>(null)
  const visitOrbitRef = useRef<OrbitControlsImpl | null>(null)
  const transformControlsRef = useRef<TransformControlsImpl | null>(null)

  const furnitureConfigs = useMemo(() => placed.map(placedToFurniture), [placed])
  const exhibits = useMemo(
    () => mergeWallPictures(house.exhibits, wallPictures),
    [house.exhibits, wallPictures],
  )

  useEffect(() => {
    for (const u of new Set(placed.map((p) => p.url))) {
      if (!isMeshySignedAssetUrl(u)) {
        useGLTF.preload(u)
      }
    }
  }, [placed])

  useEffect(() => {
    if (!selectedId || mode !== 'edit') {
      setTransformTarget(null)
      return
    }
    const g = objectRefs.current.get(selectedId)
    setTransformTarget(g ?? null)
  }, [selectedId, placed, mode])

  const selectedItem = placed.find((p) => p.id === selectedId)

  /** Orbit must stay enabled whenever nothing is selected, or after transform unmounts mid-drag. */
  useEffect(() => {
    if (mode !== 'edit') return
    if (!selectedId && editOrbitRef.current) {
      editOrbitRef.current.enabled = true
    }
  }, [mode, selectedId])

  /** Keep orbit tied to the same ref drei uses for `makeDefault` (avoids stuck `enabled: false`). */
  useEffect(() => {
    if (mode !== 'edit') return
    const tc = transformControlsRef.current
    if (!tc) return
    const tcEvents = tc as unknown as {
      addEventListener(type: 'dragging-changed', fn: (e: THREE.Event & { value?: boolean }) => void): void
      removeEventListener(type: 'dragging-changed', fn: (e: THREE.Event & { value?: boolean }) => void): void
    }
    const onDraggingChanged = (e: THREE.Event & { value?: boolean }) => {
      const orbit = editOrbitRef.current
      if (!orbit || typeof e.value !== 'boolean') return
      orbit.enabled = !e.value
    }
    tcEvents.addEventListener('dragging-changed', onDraggingChanged)
    return () => {
      tcEvents.removeEventListener('dragging-changed', onDraggingChanged)
    }
  }, [mode, selectedId, transformTarget])

  return (
    <>
      <color attach="background" args={[INTERIOR_BG]} />
      <fog attach="fog" args={[INTERIOR_BG, 18, 52]} />

      <Suspense fallback={null}>
        <Environment files={HDRI} environmentIntensity={0.68} />
      </Suspense>

      <hemisphereLight args={['#fff8f0', '#b8aea2', 0.4]} />
      <ambientLight intensity={0.03} color="#f0e8df" />
      <SunLight />

      <Suspense fallback={null}>
        <InteriorShell house={house} furniture={[]} />
      </Suspense>

      {furnitureConfigs.map((cfg) => {
        const item = placed.find((p) => p.id === cfg.id)!
        return (
          <group
            key={cfg.id}
            onClick={(e) => {
              e.stopPropagation()
              if (mode === 'edit') setSelected(item.id)
            }}
          >
            <FurnitureMesh
              ref={(node) => {
                if (node) objectRefs.current.set(cfg.id, node)
                else objectRefs.current.delete(cfg.id)
              }}
              item={cfg}
            />
          </group>
        )
      })}

      {exhibits.map((ex) => (
        <ExhibitMesh
          key={ex.id}
          exhibit={ex}
          onOpen={() => {}}
          pointerLookEnabled={false}
        />
      ))}

      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.44}
        scale={22}
        blur={2.1}
        far={9}
        color="#14100c"
      />

      {mode === 'edit' && selectedItem && transformTarget ? (
        <TransformControls
          ref={transformControlsRef}
          key={selectedId ?? 'none'}
          object={transformTarget}
          mode="translate"
          onMouseUp={() => {
            if (transformTarget && selectedItem)
              syncPlacedFromGroup(transformTarget, selectedItem, upsert)
          }}
        />
      ) : null}

      {mode === 'edit' ? (
        <OrbitControls
          ref={editOrbitRef}
          makeDefault
          enableDamping
          dampingFactor={0.055}
          rotateSpeed={1.22}
          zoomSpeed={1.08}
          minDistance={1.4}
          maxDistance={16}
          maxPolarAngle={Math.PI / 2 - 0.06}
          minPolarAngle={0.38}
          target={[0, 1.15, -1.2]}
        />
      ) : null}

      {mode === 'visit' && !visitOrbit ? (
        <VisitWalkRig spawn={house.spawn} active />
      ) : null}

      {mode === 'visit' && visitOrbit ? (
        <OrbitControls
          ref={visitOrbitRef}
          makeDefault
          enableDamping
          dampingFactor={0.055}
          rotateSpeed={1.22}
          zoomSpeed={1.08}
          minDistance={1.4}
          maxDistance={16}
          maxPolarAngle={Math.PI / 2 - 0.06}
          minPolarAngle={0.35}
          target={[0, 1.15, -1.2]}
        />
      ) : null}

      <RealisticEffects />
    </>
  )
}
