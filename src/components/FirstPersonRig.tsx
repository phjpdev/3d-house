import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import * as THREE from 'three'
import { ROOM } from './ProceduralRoom'

const SPEED = 2.15
const PLAYER_R = 0.22
const EYE = 1.55

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
  /** When false, pointer lock is released if active */
  lookEnabled: boolean
}

export function FirstPersonRig({ spawn, lookEnabled }: Props) {
  const rig = useRef<THREE.Group>(null)
  const { camera, gl } = useThree()
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const move = useRef(new THREE.Vector3())

  const controls = useMemo(() => {
    const c = new PointerLockControls(camera, gl.domElement)
    /* Slightly narrower than full ±90° so you cannot snap to “staring at shoes” or ceiling. */
    c.minPolarAngle = 0.12
    c.maxPolarAngle = Math.PI - 0.18
    return c
  }, [camera, gl.domElement])

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

    /* Face into the room (avoids a pitched-down quaternion from fighting the rig). */
    camera.rotation.order = 'YXZ'
    camera.updateMatrixWorld(true)
    camera.lookAt(initialLookTarget(spawn, EYE))

    return () => {
      g.remove(camera)
    }
  }, [camera, sx, sy, sz, spawnYaw])

  useEffect(() => {
    controls.enabled = lookEnabled
    if (!lookEnabled && controls.isLocked) controls.unlock()
  }, [controls, lookEnabled])

  useEffect(() => {
    return () => {
      controls.dispose()
    }
  }, [controls])

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
      const maxX = ROOM.half - PLAYER_R
      const maxZ = ROOM.half - PLAYER_R
      p.x = THREE.MathUtils.clamp(nx, -maxX, maxX)
      p.z = THREE.MathUtils.clamp(nz, -maxZ, maxZ)
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
