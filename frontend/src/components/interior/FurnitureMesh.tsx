import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { FurnitureConfig } from '@/types/house'
import { useMeshyGlbBlobUrl } from '@/hooks/useMeshyGlbBlobUrl'
import { ROOM } from '@/lib/houseLayout'

/** World Y of ceiling slab underside (meters). */
const CEILING_UNDER = ROOM.height - ROOM.wallT / 2

const BULB_MATERIAL_RE = /Light\./i
const SKIP_MATERIAL_RE = /Metal|Grey|White/i

type Props = {
  item: FurnitureConfig
}

function isBulbMaterial(mat: THREE.Material | THREE.Material[]): boolean {
  const list = Array.isArray(mat) ? mat : [mat]
  return list.some((m) => {
    const n = m.name || ''
    return BULB_MATERIAL_RE.test(n) && !SKIP_MATERIAL_RE.test(n)
  })
}

function findBulbMesh(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh && isBulbMaterial(mesh.material) && !found) {
      found = mesh
    }
  })
  return found
}

function boostBulbEmissive(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !isBulbMaterial(mesh.material)) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      if (!isBulbMaterial(m)) continue
      if (!('emissive' in m) || !('emissiveIntensity' in m)) continue
      const std = m as THREE.MeshStandardMaterial
      std.emissive = new THREE.Color('#fff6e8')
      std.emissiveIntensity = Math.max(std.emissiveIntensity ?? 0, 1.35)
      std.toneMapped = true
    }
  })
}

/** Spread emitters along the long axis of the bulb mesh bbox (model units). */
function bulbEmitterWorldPositions(mesh: THREE.Mesh, count: number): THREE.Vector3[] {
  const geom = mesh.geometry as THREE.BufferGeometry
  if (!geom.boundingBox) geom.computeBoundingBox()
  const bb = geom.boundingBox
  if (!bb || bb.isEmpty()) return []

  const sx = bb.max.x - bb.min.x
  const sz = bb.max.z - bb.min.z
  const alongX = sx >= sz
  const y = bb.min.y + (bb.max.y - bb.min.y) * 0.22
  const out: THREE.Vector3[] = []

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count
    const local = new THREE.Vector3()
    if (alongX) {
      local.set(bb.min.x + t * sx, y, (bb.min.z + bb.max.z) * 0.5)
    } else {
      local.set((bb.min.x + bb.max.x) * 0.5, y, bb.min.z + t * sz)
    }
    local.applyMatrix4(mesh.matrixWorld)
    out.push(local)
  }
  return out
}

function alignCloneToFloorAndCenterXZ(root: THREE.Object3D) {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  if (!box.isEmpty()) {
    const c = new THREE.Vector3()
    box.getCenter(c)
    root.position.set(-c.x, -box.min.y, -c.z)
  }
}

/** Top of bbox flush slightly below ceiling; centered in XZ (local origin = ceiling plane). */
function alignCloneToCeilingUnder(root: THREE.Object3D, gap = 0.02) {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  if (!box.isEmpty()) {
    const cx = (box.min.x + box.max.x) / 2
    const cz = (box.min.z + box.max.z) / 2
    root.position.set(-cx, -box.max.y - gap, -cz)
  }
}

function FurnitureMeshBody({
  item,
  gltfUrl,
}: {
  item: FurnitureConfig
  gltfUrl: string
}) {
  const { scene } = useGLTF(gltfUrl)
  const mount = item.mount ?? 'floor'
  const scaledRef = useRef<THREE.Group>(null)
  const [emitterLocals, setEmitterLocals] = useState<Array<[number, number, number]> | null>(null)

  const clone = useMemo(() => {
    const g = scene.clone(true)
    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.frustumCulled = false
      }
    })
    if (mount === 'ceiling') {
      boostBulbEmissive(g)
    }
    if (mount === 'ceiling') {
      alignCloneToCeilingUnder(g)
    } else {
      alignCloneToFloorAndCenterXZ(g)
    }
    return g
  }, [scene, mount])

  const s = item.scale ?? 1
  const totalIntensity = item.lightIntensity ?? (mount === 'ceiling' ? 27 : 0)

  useLayoutEffect(() => {
    if (mount !== 'ceiling' || totalIntensity <= 0) {
      setEmitterLocals(null)
      return
    }
    const scaled = scaledRef.current
    if (!scaled) return

    const bulb = findBulbMesh(clone)
    if (!bulb) {
      setEmitterLocals([[0, -0.35 * s, 0]])
      return
    }

    bulb.updateMatrixWorld(true)
    const worldPts = bulbEmitterWorldPositions(bulb, 3)
    scaled.updateMatrixWorld(true)
    const inv = new THREE.Matrix4().copy(scaled.matrixWorld).invert()
    const locals = worldPts.map((w) => {
      const v = w.clone().applyMatrix4(inv)
      return [v.x, v.y, v.z] as [number, number, number]
    })
    setEmitterLocals(locals.length ? locals : [[0, -0.35 * s, 0]])
  }, [clone, mount, s, totalIntensity])

  const perBulb =
    emitterLocals && emitterLocals.length > 0 ? totalIntensity / emitterLocals.length : totalIntensity

  return (
    <group ref={scaledRef} scale={[s, s, s]}>
      <primitive object={clone} />
      {mount === 'ceiling' && totalIntensity > 0 && emitterLocals
        ? emitterLocals.map((pos, i) => (
            <pointLight
              key={i}
              position={pos}
              intensity={perBulb}
              distance={11}
              decay={2}
              color="#fff2e0"
            />
          ))
        : null}
    </group>
  )
}

export const FurnitureMesh = forwardRef<THREE.Group, Props>(function FurnitureMesh(
  { item },
  ref,
) {
  const { loadUrl } = useMeshyGlbBlobUrl(item.url)
  const mount = item.mount ?? 'floor'
  const rx = item.rotationX ?? 0
  const ry = item.rotationY ?? 0
  const rz = item.rotationZ ?? 0
  const worldY = mount === 'ceiling' ? CEILING_UNDER : item.position[1]

  return (
    <group ref={ref} position={[item.position[0], worldY, item.position[2]]} rotation={[rx, ry, rz]}>
      {loadUrl ? <FurnitureMeshBody key={loadUrl} item={item} gltfUrl={loadUrl} /> : null}
    </group>
  )
})
