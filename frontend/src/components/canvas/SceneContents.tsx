'use client'

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
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
import type { ExhibitConfig, HouseConfig } from '@/types/house'
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
import { useFrame, useThree } from '@react-three/fiber'
import {
  clampEditCameraPosition,
  clampEditOrbitTarget,
  inWalkable,
  resolveWalkPosition,
} from '@/lib/houseLayout'
import { applyEditStructurePreset } from '@/lib/editOrbitPresets'
import type { EditStructureZone } from '@/lib/editOrbitPresets'
import { VisitWalkRig } from '@/components/canvas/VisitWalkRig'
import { RealisticEffects } from '@/components/canvas/RealisticEffects'
import {
  CoohomFurnitureEditOverlay,
  CoohomWallEditOverlay,
  useApplyCoohomTransformTheme,
} from '@/components/canvas/CoohomFurnitureEditOverlay'
import type { PlacedFurniture, WallArtPlacementPending, WallPicture } from '@/store/vividHomeStore'
import { wallPicturePlacementFromHit } from '@/lib/wallPicturePlacement'

const HDRI =
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/brown_photostudio_06_1k.hdr'

const INTERIOR_BG = '#ddd6cc'

/**
 * Coohom-style 3D navigation (see Coohom help “How to Use 2D/3D View?”):
 * left drag — rotate, right drag — pan, scroll wheel — zoom.
 */
const INTERIOR_ORBIT_MOUSE_BUTTONS = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
} as const

/** Standing-height orbit: free yaw; pitch bounded so you don’t flip under furniture. */
const INTERIOR_ORBIT_MIN_POLAR = 0.28
const INTERIOR_ORBIT_MAX_POLAR = Math.PI / 2 - 0.035
/** Minimum camera–pivot radius for orbit + wheel / MMB dolly zoom. */
const INTERIOR_ORBIT_MIN_DISTANCE = 1.08
const INTERIOR_ORBIT_MAX_DISTANCE_EDIT = 220
const INTERIOR_ORBIT_MAX_DISTANCE_VISIT = 240

/** Edit + visit share the same orbit feel; higher speeds avoid a “slow mouse” feel on large interiors. */
const INTERIOR_ORBIT_SPEED = {
  rotateSpeed: 0.78,
  panSpeed: 0.82,
  zoomSpeed: 1.25,
} as const

/** Matches Coohom-style overlay ring / drei TransformControls sizing */
const EDIT_GIZMO_SIZE = 1.06

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

function syncWallPictureFromGroup(
  g: THREE.Group,
  item: WallPicture,
  update: (id: string, patch: Partial<WallPicture>) => void,
) {
  const p = g.position
  const r = g.rotation
  const s = uniformScaleFromGroup(g)
  update(item.id, {
    position: [p.x, p.y, p.z],
    rotation: [r.x, r.y, r.z],
    rotationY: r.y,
    scale: s,
  })
}

function SelectableWallExhibit({
  exhibit,
  wallPicture,
  mode,
  onSelect,
  registerWallRef,
}: {
  exhibit: ExhibitConfig
  wallPicture: WallPicture
  mode: 'edit' | 'visit'
  onSelect: () => void
  registerWallRef: (id: string, node: THREE.Group | null) => void
}) {
  return (
    <group
      ref={(node) => registerWallRef(wallPicture.id, node)}
      position={wallPicture.position}
      rotation={wallPicture.rotation ?? [0, wallPicture.rotationY, 0]}
      scale={wallPicture.scale ?? 1}
    >
      <ExhibitMesh
        exhibit={{
          ...exhibit,
          position: [0, 0, 0],
          rotationY: 0,
          rotation: [0, 0, 0],
        }}
        onOpen={() => {}}
        pointerLookEnabled={false}
        onWallFrameSelect={mode === 'edit' ? onSelect : undefined}
      />
    </group>
  )
}

const FLOOR_MESH_NAMES = new Set(['Floor', 'CorridorSouthFloor'])

function isFloorMesh(obj: THREE.Object3D): boolean {
  return Boolean(obj.name && FLOOR_MESH_NAMES.has(obj.name))
}

function WallPlacementHandler({
  pending,
  onPlace,
}: {
  pending: WallArtPlacementPending | null
  onPlace: (pos: [number, number, number], rotationY: number) => void
}) {
  const { camera, gl, scene } = useThree()
  useEffect(() => {
    if (!pending) return
    const el = gl.domElement
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const rect = el.getBoundingClientRect()
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      for (const h of hits) {
        const placed = wallPicturePlacementFromHit(h, camera)
        if (placed) {
          e.preventDefault()
          e.stopPropagation()
          onPlace(placed.position, placed.rotationY)
          return
        }
      }
    }
    el.addEventListener('pointerdown', onPointerDown, { capture: true })
    return () => el.removeEventListener('pointerdown', onPointerDown, { capture: true })
  }, [pending, camera, gl, scene, onPlace])
  return null
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

/** When Room / Corridor is chosen in the sidebar, snap edit orbit to that volume. */
function EditOrbitStructureSync({
  zone,
  orbitRef,
  enabled,
}: {
  zone: EditStructureZone
  orbitRef: RefObject<OrbitControlsImpl | null>
  enabled: boolean
}) {
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera)

  useLayoutEffect(() => {
    if (!enabled) return
    const run = () => {
      const oc = orbitRef.current
      if (!oc) return false
      applyEditStructurePreset(zone, camera, oc)
      return true
    }
    if (run()) return
    const id = requestAnimationFrame(() => run())
    return () => cancelAnimationFrame(id)
  }, [zone, enabled, camera, orbitRef])

  return null
}

/** Distance / polar caps for orbit (positional shell handled by {@link InteriorShellClamp}). */
function InteriorOrbitLimits({
  active,
  orbitRef,
  maxDistance,
}: {
  active: boolean
  orbitRef: RefObject<OrbitControlsImpl | null>
  maxDistance: number
}) {
  useFrame(() => {
    if (!active) return
    const oc = orbitRef.current
    if (!oc) return
    oc.minDistance = INTERIOR_ORBIT_MIN_DISTANCE
    oc.maxDistance = maxDistance
    oc.minPolarAngle = INTERIOR_ORBIT_MIN_POLAR
    oc.maxPolarAngle = INTERIOR_ORBIT_MAX_POLAR
  }, 1)
  return null
}

/** Every frame: keep pivot + camera inside the procedural shell so rotation never drifts into void. */
function InteriorShellClamp({
  active,
  orbitRef,
}: {
  active: boolean
  orbitRef: RefObject<OrbitControlsImpl | null>
}) {
  const camera = useThree((s) => s.camera)
  useFrame(() => {
    if (!active) return
    const oc = orbitRef.current
    if (!oc?.target) return
    clampEditOrbitTarget(oc.target)
    oc.update()
    clampEditCameraPosition(camera.position)
  }, 2)
  return null
}

export function SceneContents({ mode }: Props) {
  const house = demoHouse as unknown as HouseConfig
  const placed = useVividHomeStore((s) => s.placedFurniture)
  const wallPictures = useVividHomeStore((s) => s.wallPictures)
  const selectedId = useVividHomeStore((s) => s.selectedPlacedId)
  const selectedWallPictureId = useVividHomeStore((s) => s.selectedWallPictureId)
  const setSelected = useVividHomeStore((s) => s.setSelectedPlacedId)
  const setSelectedWallPicture = useVividHomeStore((s) => s.setSelectedWallPictureId)
  const upsert = useVividHomeStore((s) => s.upsertPlaced)
  const updateWallPicture = useVividHomeStore((s) => s.updateWallPicture)
  const visitOrbit = useVividHomeStore((s) => s.visitUseOrbit)
  const editTransformMode = useVividHomeStore((s) => s.editTransformMode)
  const libraryPlacementPending = useVividHomeStore((s) => s.libraryPlacementPending)
  const wallArtPlacementPending = useVividHomeStore((s) => s.wallArtPlacementPending)
  const editStructureZone = useVividHomeStore((s) => s.editStructureZone)
  const placeLibraryAt = useVividHomeStore((s) => s.placeLibraryAt)
  const cancelLibraryPlacement = useVividHomeStore((s) => s.cancelLibraryPlacement)
  const cancelWallArtPlacement = useVividHomeStore((s) => s.cancelWallArtPlacement)
  const completeWallArtPlacement = useVividHomeStore((s) => s.completeWallArtPlacement)

  const onFloorPlace = useCallback(
    (libId: string, pos: [number, number, number]) => {
      placeLibraryAt(libId, pos)
    },
    [placeLibraryAt],
  )

  const onWallArtPlace = useCallback(
    (pos: [number, number, number], rotationY: number) => {
      completeWallArtPlacement(pos, rotationY)
    },
    [completeWallArtPlacement],
  )

  const objectRefs = useRef<Map<string, THREE.Group>>(new Map())
  const wallObjectRefs = useRef<Map<string, THREE.Group>>(new Map())
  const [transformTarget, setTransformTarget] = useState<THREE.Group | null>(null)
  const [wallTransformTarget, setWallTransformTarget] = useState<THREE.Group | null>(null)
  const editOrbitRef = useRef<OrbitControlsImpl | null>(null)
  const visitOrbitRef = useRef<OrbitControlsImpl | null>(null)
  const transformControlsRef = useRef<TransformControlsImpl | null>(null)

  const furnitureConfigs = useMemo(() => placed.map(placedToFurniture), [placed])
  const exhibits = useMemo(
    () => mergeWallPictures(house.exhibits, wallPictures),
    [house.exhibits, wallPictures],
  )

  const wallPictureIds = useMemo(() => new Set(wallPictures.map((w) => w.id)), [wallPictures])

  const registerWallRef = useCallback((id: string, node: THREE.Group | null) => {
    if (node) wallObjectRefs.current.set(id, node)
    else wallObjectRefs.current.delete(id)
  }, [])

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

  useEffect(() => {
    if (!selectedWallPictureId || mode !== 'edit') {
      setWallTransformTarget(null)
      return
    }
    const g = wallObjectRefs.current.get(selectedWallPictureId)
    setWallTransformTarget(g ?? null)
  }, [selectedWallPictureId, wallPictures, mode])

  const selectedItem = placed.find((p) => p.id === selectedId)
  const selectedWallPictureItem = wallPictures.find((w) => w.id === selectedWallPictureId)

  useApplyCoohomTransformTheme(
    transformControlsRef,
    mode === 'edit' && Boolean(selectedItem || selectedWallPictureItem),
    `${selectedId ?? ''}-${selectedWallPictureId ?? ''}-${editTransformMode}`,
  )

  /** Orbit must stay enabled whenever nothing is selected, or after transform unmounts mid-drag. */
  useEffect(() => {
    if (mode !== 'edit') return
    if (!selectedId && !selectedWallPictureId && editOrbitRef.current) {
      const st = useVividHomeStore.getState()
      if (!st.libraryPlacementPending && !st.wallArtPlacementPending) editOrbitRef.current.enabled = true
    }
  }, [mode, selectedId, selectedWallPictureId, libraryPlacementPending, wallArtPlacementPending])

  /** Disable orbit while placing furniture (floor) or wall art (wall click). */
  useEffect(() => {
    if (mode !== 'edit') return
    const orbit = editOrbitRef.current
    if (!orbit) return
    orbit.enabled = !libraryPlacementPending && !wallArtPlacementPending
  }, [mode, libraryPlacementPending, wallArtPlacementPending])

  /** Escape cancels placement modes */
  useEffect(() => {
    if (!libraryPlacementPending && !wallArtPlacementPending) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelLibraryPlacement()
        cancelWallArtPlacement()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    libraryPlacementPending,
    wallArtPlacementPending,
    cancelLibraryPlacement,
    cancelWallArtPlacement,
  ])

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
      const st = useVividHomeStore.getState()
      orbit.enabled = !e.value && !st.libraryPlacementPending && !st.wallArtPlacementPending
    }
    tcEvents.addEventListener('dragging-changed', onDraggingChanged)
    return () => {
      tcEvents.removeEventListener('dragging-changed', onDraggingChanged)
    }
  }, [mode, selectedId, selectedWallPictureId, transformTarget, wallTransformTarget])

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

      {exhibits.map((ex) => {
        const wp = wallPictures.find((w) => w.id === ex.id)
        if (wp && wallPictureIds.has(ex.id)) {
          return (
            <SelectableWallExhibit
              key={ex.id}
              exhibit={ex}
              wallPicture={wp}
              mode={mode}
              onSelect={() => setSelectedWallPicture(ex.id)}
              registerWallRef={registerWallRef}
            />
          )
        }
        return (
          <ExhibitMesh
            key={ex.id}
            exhibit={ex}
            onOpen={() => {}}
            pointerLookEnabled={false}
          />
        )
      })}

      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.4}
        scale={22}
        resolution={256}
        blur={1.6}
        far={9}
        color="#14100c"
      />

      {mode === 'edit' && selectedWallPictureItem && wallTransformTarget ? (
        <>
          <CoohomWallEditOverlay target={wallTransformTarget} />
          <TransformControls
            ref={transformControlsRef}
            key={`wall-${selectedWallPictureId ?? 'none'}`}
            object={wallTransformTarget}
            mode={editTransformMode}
            space="world"
            size={EDIT_GIZMO_SIZE}
            onMouseUp={() => {
              if (wallTransformTarget && selectedWallPictureItem)
                syncWallPictureFromGroup(wallTransformTarget, selectedWallPictureItem, updateWallPicture)
            }}
          />
        </>
      ) : null}

      {mode === 'edit' && selectedItem && transformTarget ? (
        <>
          <CoohomFurnitureEditOverlay
            target={transformTarget}
            transformMode={editTransformMode}
            tcRef={transformControlsRef}
            gizmoSize={EDIT_GIZMO_SIZE}
            onFurnitureSync={() => {
              if (transformTarget && selectedItem) syncPlacedFromGroup(transformTarget, selectedItem, upsert)
            }}
          />
          <TransformControls
            ref={transformControlsRef}
            key={`fur-${selectedId ?? 'none'}`}
            object={transformTarget}
            mode={editTransformMode}
            space="world"
            size={EDIT_GIZMO_SIZE}
            onMouseUp={() => {
              if (transformTarget && selectedItem) syncPlacedFromGroup(transformTarget, selectedItem, upsert)
            }}
          />
        </>
      ) : null}

      {mode === 'edit' ? (
        <>
          <WallPlacementHandler pending={wallArtPlacementPending} onPlace={onWallArtPlace} />
          <FloorPlacementHandler pendingLibId={libraryPlacementPending} onPlace={onFloorPlace} />
        </>
      ) : null}

      {mode === 'edit' ? (
        <>
          <EditOrbitStructureSync zone={editStructureZone} orbitRef={editOrbitRef} enabled />
          <InteriorOrbitLimits active orbitRef={editOrbitRef} maxDistance={INTERIOR_ORBIT_MAX_DISTANCE_EDIT} />
          <InteriorShellClamp active orbitRef={editOrbitRef} />
          <OrbitControls
            ref={editOrbitRef}
            makeDefault
            enableDamping={false}
            enablePan
            screenSpacePanning
            mouseButtons={INTERIOR_ORBIT_MOUSE_BUTTONS}
            {...INTERIOR_ORBIT_SPEED}
            minDistance={INTERIOR_ORBIT_MIN_DISTANCE}
            maxDistance={INTERIOR_ORBIT_MAX_DISTANCE_EDIT}
            maxPolarAngle={INTERIOR_ORBIT_MAX_POLAR}
            minPolarAngle={INTERIOR_ORBIT_MIN_POLAR}
            target={[0, 1.15, -1.2]}
          />
        </>
      ) : null}

      {mode === 'visit' && !visitOrbit ? (
        <VisitWalkRig spawn={house.spawn} active />
      ) : null}

      {mode === 'visit' && visitOrbit ? (
        <>
          <InteriorOrbitLimits
            active
            orbitRef={visitOrbitRef}
            maxDistance={INTERIOR_ORBIT_MAX_DISTANCE_VISIT}
          />
          <InteriorShellClamp active orbitRef={visitOrbitRef} />
          <OrbitControls
            ref={visitOrbitRef}
            makeDefault
            enableDamping={false}
            enablePan
            screenSpacePanning
            mouseButtons={INTERIOR_ORBIT_MOUSE_BUTTONS}
            {...INTERIOR_ORBIT_SPEED}
            minDistance={INTERIOR_ORBIT_MIN_DISTANCE}
            maxDistance={INTERIOR_ORBIT_MAX_DISTANCE_VISIT}
            maxPolarAngle={INTERIOR_ORBIT_MAX_POLAR}
            minPolarAngle={INTERIOR_ORBIT_MIN_POLAR}
            target={[0, 1.15, -1.2]}
          />
        </>
      ) : null}

      <RealisticEffects />
    </>
  )
}
