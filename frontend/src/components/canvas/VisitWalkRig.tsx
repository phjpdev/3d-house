'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { resolveWalkPosition } from '@/lib/houseLayout'
import { KeyboardTracker } from '@/components/interior/FirstPersonRig'

const SPEED = 3.35
const EYE = 1.7
/** Pointer-lock look — slightly higher than vanilla FPS so explore mode feels responsive. */
const LOOK_SENS = 0.004
const PITCH_MIN = -1.2
const PITCH_MAX = 1.25

function initialLookTarget(
  spawn: { position: [number, number, number]; rotationY: number },
  eyeHeight: number,
): THREE.Vector3 {
  const [px, py, pz] = spawn.position
  const y = spawn.rotationY
  const eye = new THREE.Vector3(px, py + eyeHeight, pz)
  const forward = new THREE.Vector3(-Math.sin(y), 0, -Math.cos(y)).normalize()
  return eye.clone().addScaledVector(forward, 5.5).setY(1.4)
}

type Props = {
  spawn: { position: [number, number, number]; rotationY: number }
  active: boolean
}

/**
 * First-person with pointer lock (WASD + mouse). Head-bob is subtle to keep a residential,
 * non-arcade feel. Collision reuses the same 2D walkable mask as the drag-look rig.
 */
export function VisitWalkRig({ spawn, active }: Props) {
  const rig = useRef<THREE.Group>(null)
  const bobPhase = useRef(0)
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
    camera.lookAt(initialLookTarget({ position: [sx, sy, sz], rotationY: spawnYaw }, EYE))
    return () => {
      g.remove(camera)
    }
  }, [camera, sx, sy, sz, spawnYaw])

  useEffect(() => {
    const el = gl.domElement
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el || !active) return
      camera.rotation.order = 'YXZ'
      camera.rotation.y -= e.movementX * LOOK_SENS
      camera.rotation.x -= e.movementY * LOOK_SENS
      camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, PITCH_MIN, PITCH_MAX)
    }
    const onClick = () => {
      if (!active) return
      if (document.pointerLockElement !== el) el.requestPointerLock()
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('click', onClick)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('click', onClick)
    }
  }, [gl.domElement, camera, active])

  useFrame((_, dt) => {
    if (!rig.current || !active) return

    const keys = getKeys()
    const yaw = camera.rotation.y
    forward.current.set(-Math.sin(yaw), 0, -Math.cos(yaw))
    right.current.set(Math.cos(yaw), 0, -Math.sin(yaw))

    move.current.set(0, 0, 0)
    if (keys.forward) move.current.add(forward.current)
    if (keys.back) move.current.sub(forward.current)
    if (keys.left) move.current.sub(right.current)
    if (keys.right) move.current.add(right.current)

    const walking = move.current.lengthSq() > 0
    if (walking) {
      move.current.normalize().multiplyScalar(SPEED * dt)
      const p = rig.current.position
      const nx = p.x + move.current.x
      const nz = p.z + move.current.z
      const [rx, rz] = resolveWalkPosition(nx, nz, p.x, p.z)
      p.x = rx
      p.z = rz
      bobPhase.current += dt * 10.4
    } else {
      bobPhase.current = 0
    }

    const bob = walking ? Math.sin(bobPhase.current) * 0.018 : 0
    camera.position.y = EYE + bob
  })

  return (
    <>
      <KeyboardTracker />
      <group ref={rig} />
    </>
  )
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
