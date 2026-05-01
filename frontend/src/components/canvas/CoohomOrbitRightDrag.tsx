'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import type { RefObject } from 'react'

type Props = {
  orbitRef: RefObject<OrbitControlsImpl | null>
  active: boolean
}

/**
 * Coohom BIM-style right drag: X = screen pan (strafe), Y = dolly forward/back along the view axis.
 * Requires `mouseButtons.RIGHT` set to a non-PAN action (e.g. `-1`) so OrbitControls ignores RMB; see SceneContents.
 */
export function CoohomOrbitRightDrag({ orbitRef, active }: Props) {
  const { camera, gl } = useThree()

  useEffect(() => {
    if (!active) return
    const el = gl.domElement
    const cam = camera as THREE.PerspectiveCamera
    if (!cam.isPerspectiveCamera) return

    let captureId: number | null = null
    let lastX = 0
    let lastY = 0

    const offset = new THREE.Vector3()
    const panVec = new THREE.Vector3()

    const onDown = (e: PointerEvent) => {
      if (e.button !== 2) return
      const oc = orbitRef.current
      if (!oc?.enabled) return
      captureId = e.pointerId
      lastX = e.clientX
      lastY = e.clientY
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      e.preventDefault()
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== captureId || captureId === null) return
      const oc = orbitRef.current
      if (!oc?.enabled) return

      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      if (dx === 0 && dy === 0) return

      // Horizontal: same factor as OrbitControls `pan()` with dy = 0 (screen-space X).
      if (dx !== 0) {
        offset.copy(cam.position).sub(oc.target)
        let targetDistance = offset.length()
        targetDistance *= Math.tan((cam.fov / 2) * (Math.PI / 180))
        const panScale = (2 * dx * oc.panSpeed * targetDistance) / Math.max(1, el.clientHeight)
        panVec.setFromMatrixColumn(cam.matrix, 0).multiplyScalar(-panScale)
        oc.target.add(panVec)
        cam.position.add(panVec)
      }

      // Vertical: dolly along view ray (drag up → zoom out / smaller on screen, drag down → zoom in / bigger).
      if (dy !== 0) {
        offset.copy(cam.position).sub(oc.target)
        const len = offset.length()
        if (len > 1e-6) {
          const k = (dy / Math.max(1, el.clientHeight)) * 2.35 * oc.zoomSpeed
          const newLen = THREE.MathUtils.clamp(len * (1 - k), oc.minDistance, oc.maxDistance)
          offset.normalize().multiplyScalar(newLen)
          cam.position.copy(oc.target).add(offset)
        }
      }

      oc.update()
      e.preventDefault()
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== captureId) return
      captureId = null
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)

    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [active, camera, gl.domElement, orbitRef])

  return null
}
