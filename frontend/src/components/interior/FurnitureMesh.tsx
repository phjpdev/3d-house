import { forwardRef, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { FurnitureConfig } from '@/types/house'
import { useMeshyGlbBlobUrl } from '@/hooks/useMeshyGlbBlobUrl'
import { useModelUrlReachable } from '@/hooks/useModelUrlReachable'
import { applyDeskRoundedCorners, stylizeBareDeskMaterials } from '@/lib/gltfDeskMaterialStyle'
import {
  enhanceBareFurnitureMaterials,
  type WoodTextureBundle,
} from '@/lib/gltfFurnitureMaterialEnhance'
import { interiorTexturePaths } from '@/components/interior/interiorTextureUrls'
import { normalizeExtremeModelScale } from '@/lib/normalizeExtremeGltfScale'
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

/** Cool light grey upholstery (~screenshot 1), not pure white — reads softer under daylight + HDR. */
const FABRIC_STONE_GREY = new THREE.Color('#cfd2d8')
const METAL_LEG_SILVER = new THREE.Color('#c4c9d1')

function gltfObjectLabel(o: THREE.Object3D): string {
  const parts: string[] = []
  let x: THREE.Object3D | null = o
  while (x) {
    if (x.name) parts.push(x.name)
    x = x.parent
  }
  return parts.join(' ').toLowerCase()
}

/** Heuristic: thin metal legs vs fabric shells (this project's couch exports use `Circle` for legs). */
function meshLooksLikeMetalTrim(mesh: THREE.Mesh): boolean {
  return /\bcircle\b|\bmetal\b|\bleg\b|\bframe\b|\bchrome\b|\bsteel\b|\bfoot\b/i.test(
    gltfObjectLabel(mesh),
  )
}

function materialLuminance(c: THREE.Color): number {
  return c.r * 0.299 + c.g * 0.587 + c.b * 0.114
}

/** Avoid redundant state updates for ceiling point-light positions (same values, new array). */
function emitterLocalsEqual(
  a: Array<[number, number, number]> | null,
  b: Array<[number, number, number]> | null,
): boolean {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const [ax, ay, az] = a[i]!
    const [bx, by, bz] = b[i]!
    if (Math.abs(ax - bx) > 1e-6 || Math.abs(ay - by) > 1e-6 || Math.abs(az - bz) > 1e-6) return false
  }
  return true
}

/**
 * glTF `KHR_materials_unlit` loads as MeshBasicMaterial (flat, ignores lights). With default
 * white baseColor and no textures — common for CAD-style exports — the mesh reads as a blown-out
 * white slab next to lit PBR geometry. Swap to standard material so sun/HDR/shadows apply.
 *
 * Near-white untextured parts get a cool grey fabric tint so they match reference interiors;
 * named metal/leg nodes stay brighter with higher metalness.
 */
function replaceUnlitMaterialsWithPBR(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return

    const upgrade = (m: THREE.Material): THREE.Material => {
      if (!(m instanceof THREE.MeshBasicMaterial)) return m
      const lum = materialLuminance(m.color)
      const nearNeutral = lum > 0.82 && !m.map
      const metalTrim = meshLooksLikeMetalTrim(mesh) && nearNeutral

      const color = metalTrim
        ? METAL_LEG_SILVER.clone()
        : nearNeutral
          ? FABRIC_STONE_GREY.clone()
          : m.color.clone()
      const roughness = metalTrim ? 0.36 : nearNeutral ? 0.93 : 0.88
      const metalness = metalTrim ? 0.78 : nearNeutral ? 0.02 : 0.04
      const envMapIntensity = metalTrim ? 0.72 : nearNeutral ? 0.32 : 0.48

      const std = new THREE.MeshStandardMaterial({
        name: m.name,
        map: m.map,
        aoMap: m.aoMap,
        lightMap: m.lightMap,
        lightMapIntensity: m.lightMapIntensity,
        color,
        roughness,
        metalness,
        envMapIntensity,
        transparent: m.transparent,
        opacity: m.opacity,
        alphaMap: m.alphaMap,
        alphaTest: m.alphaTest,
        side: m.side,
        depthWrite: m.depthWrite,
        depthTest: m.depthTest,
      })
      if (m.vertexColors) std.vertexColors = true
      m.dispose()
      return std
    }

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(upgrade)
    } else {
      mesh.material = upgrade(mesh.material)
    }
  })
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

  const woodTex = useTexture({
    map: interiorTexturePaths.floorDiffuse,
    roughnessMap: interiorTexturePaths.floorRoughness,
    bumpMap: interiorTexturePaths.floorBump,
  }) as WoodTextureBundle

  /**
   * `useTexture` must not be a `useMemo` dependency by reference — in some R3F / drei versions the
   * returned object identity changes every render, which recreates `clone`, retriggers
   * `useLayoutEffect` → `setEmitterLocals` → infinite "Maximum update depth" on ceiling lights.
   */
  const woodTexKey = `${woodTex.map.uuid}|${woodTex.roughnessMap.uuid}|${woodTex.bumpMap.uuid}`

  const clone = useMemo(() => {
    const g = scene.clone(true)
    replaceUnlitMaterialsWithPBR(g)
    enhanceBareFurnitureMaterials(g, gltfUrl, woodTex)
    stylizeBareDeskMaterials(g)
    normalizeExtremeModelScale(g)
    applyDeskRoundedCorners(g)
    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.frustumCulled = true
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `woodTex` reference churns; `woodTexKey` pins stable textures.
  }, [scene, mount, gltfUrl, woodTexKey])

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
      const fallback: Array<[number, number, number]> = [[0, -0.35 * s, 0]]
      setEmitterLocals((prev) => (emitterLocalsEqual(prev, fallback) ? prev : fallback))
      return
    }

    bulb.updateMatrixWorld(true)
    const worldPts = bulbEmitterWorldPositions(bulb, 3)
    scaled.updateMatrixWorld(true)
    const inv = new THREE.Matrix4().copy(scaled.matrixWorld).invert()
    const locals: Array<[number, number, number]> = worldPts.map((w) => {
      const v = w.clone().applyMatrix4(inv)
      return [v.x, v.y, v.z] as [number, number, number]
    })
    const next: Array<[number, number, number]> =
      locals.length > 0 ? locals : [[0, -0.35 * s, 0]]
    setEmitterLocals((prev) => (emitterLocalsEqual(prev, next) ? prev : next))
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

function FurnitureMeshLoadGate({
  item,
  loadUrl,
}: {
  item: FurnitureConfig
  loadUrl: string
}) {
  const reachable = useModelUrlReachable(loadUrl)

  if (reachable !== 'reachable') return null
  return <FurnitureMeshBody key={loadUrl} item={item} gltfUrl={loadUrl} />
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
      {loadUrl ? <FurnitureMeshLoadGate item={item} loadUrl={loadUrl} /> : null}
    </group>
  )
})
