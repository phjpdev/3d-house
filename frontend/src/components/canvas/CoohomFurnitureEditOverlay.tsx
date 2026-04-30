'use client'

import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import type { TransformControls as TransformControlsImpl } from 'three-stdlib'
import type { EditTransformMode } from '@/store/vividHomeStore'
import { applyCoohomTransformTheme } from '@/lib/coohomTransformTheme'

const BOX_COLOR = '#2f9ffb'

const _box = new THREE.Box3()
const _size = new THREE.Vector3()
const _center = new THREE.Vector3()
const _world = new THREE.Vector3()
const _plane = new THREE.Plane()
const _planeHit = new THREE.Vector3()
const _ray = new THREE.Raycaster()

/** World-space selection frame (Coohom-style). */
function SelectionBoundingBox({ target }: { target: THREE.Object3D }) {
  const groupRef = useRef<THREE.Group>(null)
  const boxGeom = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const edgesGeom = useMemo(() => new THREE.EdgesGeometry(boxGeom), [boxGeom])

  useFrame(() => {
    const g = groupRef.current
    if (!g || !target) return
    _box.setFromObject(target)
    if (_box.isEmpty()) return
    _box.getSize(_size)
    _box.getCenter(_center)
    const pad = 1.014
    g.position.copy(_center)
    g.scale.set(Math.max(_size.x * pad, 0.04), Math.max(_size.y * pad, 0.04), Math.max(_size.z * pad, 0.04))
  })

  return (
    <group ref={groupRef} raycast={() => null}>
      <lineSegments geometry={edgesGeom} raycast={() => null}>
        <lineBasicMaterial color={BOX_COLOR} depthTest transparent opacity={0.95} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

/** Translucent axis-aligned cube + white center diamond at pivot (translate mode). */
function CoohomPivotDecor({ target }: { target: THREE.Object3D }) {
  const rootRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const g = rootRef.current
    if (!g || !target) return
    target.updateMatrixWorld(true)
    target.matrixWorld.decompose(g.position, g.quaternion, g.scale)
  })

  return (
    <group ref={rootRef} raycast={() => null}>
      <mesh raycast={() => null} renderOrder={1002}>
        <boxGeometry args={[0.13, 0.13, 0.13]} />
        <meshBasicMaterial
          attach="material-0"
          color="#f5d547"
          transparent
          opacity={0.42}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
        <meshBasicMaterial
          attach="material-1"
          color="#f5d547"
          transparent
          opacity={0.42}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
        <meshBasicMaterial
          attach="material-2"
          color="#5ee7ff"
          transparent
          opacity={0.42}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
        <meshBasicMaterial
          attach="material-3"
          color="#5ee7ff"
          transparent
          opacity={0.42}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
        <meshBasicMaterial
          attach="material-4"
          color="#e070ff"
          transparent
          opacity={0.42}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
        <meshBasicMaterial
          attach="material-5"
          color="#e070ff"
          transparent
          opacity={0.42}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh raycast={() => null} rotation={[0, Math.PI / 4, 0]} renderOrder={1003}>
        <octahedronGeometry args={[0.035, 0]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.95}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

/** Thin white pivot axes (screenshot 4). */
function PivotAxisLines({ target }: { target: THREE.Object3D }) {
  const groupRef = useRef<THREE.Group>(null)
  const geom = useMemo(() => {
    const len = 0.26
    const positions = new Float32Array([
      0,
      0,
      0,
      len,
      0,
      0,
      0,
      0,
      0,
      0,
      len,
      0,
      0,
      0,
      0,
      0,
      0,
      len,
    ])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [])

  useFrame(() => {
    const g = groupRef.current
    if (!g || !target) return
    target.updateMatrixWorld(true)
    target.matrixWorld.decompose(g.position, g.quaternion, g.scale)
  })

  return (
    <group ref={groupRef} raycast={() => null}>
      <lineSegments geometry={geom} raycast={() => null}>
        <lineBasicMaterial color="#f4f4f4" depthTest={false} transparent opacity={0.88} />
      </lineSegments>
    </group>
  )
}

type YawArcProps = {
  target: THREE.Object3D
  tcRef: RefObject<TransformControlsImpl | null>
  /** Same value as `<TransformControls size={…} />` for matching ring radius */
  gizmoSize: number
  onDragEnd: () => void
}

/**
 * World-horizontal yaw ring (Coohom screenshot 4). Separate from TransformControls because
 * stock controls only raycast one mode at a time.
 */
function WorldYawDragRing({ target, tcRef, gizmoSize, onDragEnd }: YawArcProps) {
  const rootRef = useRef<THREE.Group>(null)
  const pickerRef = useRef<THREE.Mesh>(null)
  const { camera, gl, invalidate } = useThree()
  const dragging = useRef(false)
  const pointerId = useRef<number | null>(null)
  const lastAngle = useRef(0)
  const tcDragging = useRef(false)

  const arcGeom = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, 1, 1, -Math.PI * 0.82, Math.PI * 0.82, false, 0)
    const pts2 = curve.getPoints(56)
    const pts3 = pts2.map((p) => new THREE.Vector3(p.x, 0, p.y))
    const g = new THREE.BufferGeometry().setFromPoints(pts3)
    return g
  }, [])

  useEffect(() => {
    const tc = tcRef.current as unknown as {
      addEventListener(name: string, fn: (e: THREE.Event & { value?: boolean }) => void): void
      removeEventListener(name: string, fn: (e: THREE.Event & { value?: boolean }) => void): void
    }
    if (!tc) return
    const onTcDrag = (e: THREE.Event & { value?: boolean }) => {
      tcDragging.current = Boolean(e.value)
    }
    tc.addEventListener('dragging-changed', onTcDrag)
    return () => tc.removeEventListener('dragging-changed', onTcDrag)
  }, [tcRef, target])

  useFrame(() => {
    const root = rootRef.current
    if (!root || !target) return
    target.getWorldPosition(_world)
    root.position.copy(_world)
    root.quaternion.identity()
    const r = 0.92 * gizmoSize
    root.scale.setScalar(r)
  })

  const ndcFromEvent = useCallback(
    (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      return new THREE.Vector2(x, y)
    },
    [gl.domElement],
  )

  const angleOnFloor = useCallback(
    (clientX: number, clientY: number) => {
      target.getWorldPosition(_world)
      _plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), _world)
      const rect = gl.domElement.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
      _ray.setFromCamera(ndc, camera)
      if (!_ray.ray.intersectPlane(_plane, _planeHit)) return null
      const dx = _planeHit.x - _world.x
      const dz = _planeHit.z - _world.z
      return Math.atan2(dx, dz)
    },
    [camera, gl.domElement, target],
  )

  useEffect(() => {
    const el = gl.domElement

    const endDrag = () => {
      if (!dragging.current) return
      dragging.current = false
      pointerId.current = null
      onDragEnd()
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || tcDragging.current) return
      if (!pickerRef.current) return
      _ray.setFromCamera(ndcFromEvent(e), camera)
      const hits = _ray.intersectObject(pickerRef.current, false)
      if (!hits.length) return
      const a = angleOnFloor(e.clientX, e.clientY)
      if (a === null) return
      dragging.current = true
      pointerId.current = e.pointerId
      lastAngle.current = a
      el.setPointerCapture(e.pointerId)
      e.preventDefault()
      e.stopPropagation()
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging.current || e.pointerId !== pointerId.current) return
      const a = angleOnFloor(e.clientX, e.clientY)
      if (a === null) return
      let delta = a - lastAngle.current
      if (delta > Math.PI) delta -= Math.PI * 2
      if (delta < -Math.PI) delta += Math.PI * 2
      lastAngle.current = a
      target.rotation.y += delta
      invalidate()
      e.stopPropagation()
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId.current) return
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* */
      }
      endDrag()
    }

    el.addEventListener('pointerdown', onDown, { capture: true })
    el.addEventListener('pointermove', onMove, { capture: true })
    el.addEventListener('pointerup', onUp, { capture: true })
    el.addEventListener('pointercancel', onUp, { capture: true })
    return () => {
      el.removeEventListener('pointerdown', onDown, { capture: true })
      el.removeEventListener('pointermove', onMove, { capture: true })
      el.removeEventListener('pointerup', onUp, { capture: true })
      el.removeEventListener('pointercancel', onUp, { capture: true })
    }
  }, [angleOnFloor, camera, gl.domElement, invalidate, ndcFromEvent, onDragEnd, target])

  const diamondAngle = 0.75

  return (
    <group ref={rootRef} raycast={() => null}>
      <lineLoop geometry={arcGeom} raycast={() => null} renderOrder={1001}>
        <lineBasicMaterial
          color="#2b7fff"
          depthTest
          transparent
          opacity={0.95}
          toneMapped={false}
        />
      </lineLoop>
      <mesh
        position={[Math.sin(diamondAngle), 0, Math.cos(diamondAngle)]}
        rotation={[0, diamondAngle + Math.PI / 2, 0]}
        raycast={() => null}
        renderOrder={1001}
      >
        <octahedronGeometry args={[0.045, 0]} />
        <meshBasicMaterial color="#2b7fff" depthTest toneMapped={false} />
      </mesh>
      <mesh ref={pickerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.14, 6, 40]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function useApplyCoohomTransformTheme(
  tcRef: RefObject<TransformControlsImpl | null>,
  active: boolean,
  revision: unknown,
) {
  useLayoutEffect(() => {
    if (!active) return
    let id = requestAnimationFrame(() => {
      const tc = tcRef.current
      if (tc) applyCoohomTransformTheme(tc)
    })
    return () => cancelAnimationFrame(id)
  }, [active, tcRef, revision])
}

type OverlayProps = {
  target: THREE.Object3D | null
  transformMode: EditTransformMode
  tcRef: RefObject<TransformControlsImpl | null>
  /** Must match TransformControls `size` on the same selection */
  gizmoSize: number
  onFurnitureSync: () => void
}

export function CoohomWallEditOverlay({ target }: { target: THREE.Object3D | null }) {
  if (!target) return null
  return <SelectionBoundingBox target={target} />
}

export function CoohomFurnitureEditOverlay({
  target,
  transformMode,
  tcRef,
  gizmoSize,
  onFurnitureSync,
}: OverlayProps) {
  if (!target) return null

  return (
    <>
      <SelectionBoundingBox target={target} />
      {transformMode === 'translate' ? <PivotAxisLines target={target} /> : null}
      {transformMode === 'translate' ? (
        <>
          <CoohomPivotDecor target={target} />
          <WorldYawDragRing
            target={target}
            tcRef={tcRef}
            gizmoSize={gizmoSize}
            onDragEnd={onFurnitureSync}
          />
        </>
      ) : null}
    </>
  )
}
