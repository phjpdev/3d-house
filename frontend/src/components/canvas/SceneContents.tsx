'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { loadMeshyGlbViaProxy } from '@/lib/meshyGlbProxyCache'
import { useVividHomeStore } from '@/store/vividHomeStore'
import { useThree } from '@react-three/fiber'
import { inWalkable, resolveWalkPosition } from '@/lib/houseLayout'
import { VisitWalkRig } from '@/components/canvas/VisitWalkRig'
import { RealisticEffects } from '@/components/canvas/RealisticEffects'
import type { PlacedFurniture } from '@/store/vividHomeStore'

const HDRI =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/brown_photostudio_06_1k.hdr'

const INTERIOR_BG = '#ddd6cc'

type Props = {
  mode: 'edit' | 'visit'
}

function uniformScaleFromGroup(g: THREE.Group): number {
  const { x, y, z } = g.scale
  if (Math.abs(x - y) < 1e-5 && Math.abs(y - z) < 1e-5) return x
  const u = (x + y + z) / 3
  g.scale.setScalar(u)
  return u
}

function syncPlacedFromGroup(
  g: THREE.Group,
  item: PlacedFurniture,
  upsert: (p: PlacedFurniture) => void,
) {
  const p = g.position
  const r = g.rotation
  const s = uniformScaleFromGroup(g)
  upsert({
    ...item,
    position: [p.x, p.y, p.z],
    rotation: [r.x, r.y, r.z],
    scale: s,
  })
}

const FLOOR_MESH_NAMES = new Set(['Floor', 'CorridorSouthFloor', 'CorridorEastFloor'])

function isFloorMesh(obj: THREE.Object3D): boolean {
  return Boolean(obj.name && FLOOR_MESH_NAMES.has(obj.name))
}

function FloorPlacementHandler({
  pendingLibId,
  onPlace,
}: {
  pendingLibId: string | null
  onPlace: (libId: string, pos: [number, number, number]) => void
}) {
  const { camera, gl, scene } = useThree()
  useEffect(() => {
    if (!pendingLibId) return
    const el = gl.domElement
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const rect = el.getBoundingClientRect()
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      const floorHit = hits.find((h) => isFloorMesh(h.object))
      if (!floorHit) return
      let px = floorHit.point.x
      let pz = floorHit.point.z
      if (!inWalkable(px, pz)) {
        ;[px, pz] = resolveWalkPosition(px, pz, 0, 0)
      }
      e.preventDefault()
      e.stopPropagation()
      onPlace(pendingLibId, [px, 0, pz])
    }
    el.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => el.removeEventListener('pointerdown', onPointerDown, { capture: true })
  }, [pendingLibId, camera, gl, scene, onPlace])
  return null
}

export function SceneContents({ mode }: Props) {
  const house = demoHouse as unknown as HouseConfig
  const placed = useVividHomeStore((s) => s.placedFurniture)
  const wallPictures = useVividHomeStore((s) => s.wallPictures)
  const selectedId = useVividHomeStore((s) => s.selectedPlacedId)
  const setSelected = useVividHomeStore((s) => s.setSelectedPlacedId)
  const upsert = useVividHomeStore((s) => s.upsertPlaced)
  const visitOrbit = useVividHomeStore((s) => s.visitUseOrbit)
  const editTransformMode = useVividHomeStore((s) => s.editTransformMode)
  const libraryPlacementPending = useVividHomeStore((s) => s.libraryPlacementPending)
  const placeLibraryAt = useVividHomeStore((s) => s.placeLibraryAt)
  const cancelLibraryPlacement = useVividHomeStore((s) => s.cancelLibraryPlacement)

  const onFloorPlace = useCallback(
    (libId: string, pos: [number, number, number]) => {
      placeLibraryAt(libId, pos)
    },
    [placeLibraryAt],
  )

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
      if (isMeshySignedAssetUrl(u)) {
        void loadMeshyGlbViaProxy(u).catch(() => {})
      } else {
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
      const pending = useVividHomeStore.getState().libraryPlacementPending
      if (!pending) editOrbitRef.current.enabled = true
    }
  }, [mode, selectedId, libraryPlacementPending])

  /** Disable orbit while placing from library (floor click). */
  useEffect(() => {
    if (mode !== 'edit') return
    const orbit = editOrbitRef.current
    if (!orbit) return
    orbit.enabled = !libraryPlacementPending
  }, [mode, libraryPlacementPending])

  /** Escape cancels library placement mode */
  useEffect(() => {
    if (!libraryPlacementPending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelLibraryPlacement()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [libraryPlacementPending, cancelLibraryPlacement])

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
      const pending = useVividHomeStore.getState().libraryPlacementPending
      orbit.enabled = !e.value && !pending
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
          mode={editTransformMode}
          onMouseUp={() => {
            if (transformTarget && selectedItem)
              syncPlacedFromGroup(transformTarget, selectedItem, upsert)
          }}
        />
      ) : null}

      {mode === 'edit' ? (
        <FloorPlacementHandler pendingLibId={libraryPlacementPending} onPlace={onFloorPlace} />
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
