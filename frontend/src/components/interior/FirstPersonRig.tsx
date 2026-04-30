'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { lookDragSync } from '@/lib/lookDragSync'
import { resolveWalkPosition } from '@/lib/houseLayout'

const SPEED = 2.15
const EYE = 1.55
const LOOK_SENS = 0.0032
/** Pixels of movement before we treat the gesture as “look drag”, not a tap */
const DRAG_THRESHOLD_PX = 6
const PITCH_MIN = -1.22
const PITCH_MAX = 1.32

/** World point ahead of the viewer from spawn + yaw (keeps first frame horizontal, facing into the room). */
function initialLookTarget(
  spawn: { position: [number, number, number]; rotationY: number },
  eyeHeight: number,
): THREE.Vector3 {
  const [px, py, pz] = spawn.position
  const y = spawn.rotationY
  const eye = new THREE.Vector3(px, py + eyeHeight, pz)
  const forward = new THREE.Vector3(-Math.sin(y), 0, -Math.cos(y)).normalize()
  return eye.clone().addScaledVector(forward, 6).setY(1.45)
}

type Props = {
  spawn: { position: [number, number, number]; rotationY: number }
  /** When false, drag look is disabled (e.g. owner panel open) */
  lookEnabled: boolean
}

export function FirstPersonRig({ spawn, lookEnabled }: Props) {
  const rig = useRef<THREE.Group>(null)
  const { camera, gl } = useThree()
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const move = useRef(new THREE.Vector3())

  const sx = spawn.position[0]
  const sy = spawn.position[1]
  const sz = spawn.position[2]
  const spawnYaw = spawn.rotationY

  useEffect(() => {
    const g = rig.current
    if (!g) return

    g.add(camera)
    camera.up.set(0, 1, 0)
    camera.position.set(0, EYE, 0)
    g.position.set(sx, sy, sz)

    camera.rotation.order = 'YXZ'
    camera.updateMatrixWorld(true)
    camera.lookAt(
      initialLookTarget(
        { position: [sx, sy, sz], rotationY: spawnYaw },
        EYE,
      ),
    )

    return () => {
      g.remove(camera)
    }
  }, [camera, sx, sy, sz, spawnYaw])

  useEffect(() => {
    const el = gl.domElement

    let dragging = false
    let captureActive = false
    let startX = 0
    let startY = 0
    let lastX = 0
    let lastY = 0
    let meaningfulMove = false

    const applyLook = (clientX: number, clientY: number) => {
      const dx = clientX - lastX
      const dy = clientY - lastY
      lastX = clientX
      lastY = clientY
      if (Math.abs(dx) + Math.abs(dy) < 0.001) return

      const distFromStart = Math.hypot(clientX - startX, clientY - startY)
      if (distFromStart > DRAG_THRESHOLD_PX) meaningfulMove = true

      camera.rotation.order = 'YXZ'
      camera.rotation.y -= dx * LOOK_SENS
      camera.rotation.x -= dy * LOOK_SENS
      camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, PITCH_MIN, PITCH_MAX)
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!lookEnabled || e.button !== 0) return
      dragging = true
      captureActive = false
      meaningfulMove = false
      lookDragSync.lookDragging = true
      startX = lastX = e.clientX
      startY = lastY = e.clientY
      el.style.cursor = 'grabbing'
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!lookEnabled || !dragging) return
      if (!captureActive) {
        const d = Math.hypot(e.clientX - startX, e.clientY - startY)
        if (d > DRAG_THRESHOLD_PX) {
          try {
            el.setPointerCapture(e.pointerId)
            captureActive = true
          } catch {
            /* ignore */
          }
        }
      }
      applyLook(e.clientX, e.clientY)
    }

    const endDrag = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      lookDragSync.lookDragging = false
      if (meaningfulMove) lookDragSync.blockNextExhibitClick = true
      if (captureActive) {
        try {
          el.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
        captureActive = false
      }
      el.style.cursor = lookEnabled ? 'grab' : 'auto'
    }

    const onLostCapture = () => {
      dragging = false
      lookDragSync.lookDragging = false
      captureActive = false
      if (meaningfulMove) lookDragSync.blockNextExhibitClick = true
      el.style.cursor = lookEnabled ? 'grab' : 'auto'
    }

    const onPointerLeave = () => {
      if (!dragging) el.style.cursor = lookEnabled ? 'grab' : 'auto'
    }

    const onPointerEnter = () => {
      if (lookEnabled && !dragging) el.style.cursor = 'grab'
    }

    const onContextMenu = (e: Event) => e.preventDefault()

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener('lostpointercapture', onLostCapture)
    el.addEventListener('pointerleave', onPointerLeave)
    el.addEventListener('pointerenter', onPointerEnter)
    el.addEventListener('contextmenu', onContextMenu)

    if (lookEnabled) el.style.cursor = 'grab'

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('lostpointercapture', onLostCapture)
      el.removeEventListener('pointerleave', onPointerLeave)
      el.removeEventListener('pointerenter', onPointerEnter)
      el.removeEventListener('contextmenu', onContextMenu)
      el.style.cursor = 'auto'
    }
  }, [gl.domElement, camera, lookEnabled])

  useFrame((_, dt) => {
    if (!rig.current) return

    const keys = getKeys()
    const yaw = camera.rotation.y
    forward.current.set(-Math.sin(yaw), 0, -Math.cos(yaw))
    right.current.set(Math.cos(yaw), 0, -Math.sin(yaw))

    move.current.set(0, 0, 0)
    if (keys.forward) move.current.add(forward.current)
    if (keys.back) move.current.sub(forward.current)
    if (keys.left) move.current.sub(right.current)
    if (keys.right) move.current.add(right.current)

    if (move.current.lengthSq() > 0) {
      move.current.normalize().multiplyScalar(SPEED * dt)
      const p = rig.current.position
      const nx = p.x + move.current.x
      const nz = p.z + move.current.z
      const [rx, rz] = resolveWalkPosition(nx, nz, p.x, p.z)
      p.x = rx
      p.z = rz
    }
  })

  return <group ref={rig} />
}

function getKeys() {
  const pressed = (code: string) =>
    typeof window !== 'undefined' && window.__houseKeys?.has(code)

  return {
    forward: pressed('KeyW') || pressed('ArrowUp'),
    back: pressed('KeyS') || pressed('ArrowDown'),
    left: pressed('KeyA') || pressed('ArrowLeft'),
    right: pressed('KeyD') || pressed('ArrowRight'),
  }
}

declare global {
  interface Window {
    __houseKeys?: Set<string>
  }
}

export function KeyboardTracker() {
  useEffect(() => {
    const s = new Set<string>()
    window.__houseKeys = s
    const down = (e: KeyboardEvent) => {
      s.add(e.code)
    }
    const up = (e: KeyboardEvent) => {
      s.delete(e.code)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      delete window.__houseKeys
    }
  }, [])
  return null
}
