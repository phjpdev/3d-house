import * as THREE from 'three'
import { VIVIDHOME_DESK_ENHANCED } from '@/lib/gltfDeskMaterialStyle'

/** Warm oak tone multiplied over hardwood diffuse — reads like stained furniture, not a grey shader toy. */
const WOOD_TINT = new THREE.Color('#c4b4a4')

export type WoodTextureBundle = {
  map: THREE.Texture
  roughnessMap: THREE.Texture
  bumpMap: THREE.Texture
}

function objectLabel(o: THREE.Object3D): string {
  const parts: string[] = []
  let x: THREE.Object3D | null = o
  while (x) {
    if (x.name) parts.push(x.name)
    x = x.parent
  }
  return parts.join(' ').toLowerCase()
}

function isUntexturedPbr(m: THREE.Material): boolean {
  return (
    (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) && !m.map
  )
}

function urlHints(url: string) {
  const u = url.toLowerCase()
  return {
    /** Filename suggests a desk/table asset (excludes explicit chair URLs). */
    deskLike: /desk|workspace/i.test(u) && !/chair/i.test(u),
    /** Filename suggests TV / media furniture (incl. `TV.glb`). */
    tvLike: /tv|television|entertainment|media|monitor|credenza|console/i.test(u),
  }
}

/** Mesh + material names as one lowercase string (exporters use `Desk_Plane`, `DefaultMaterial`, etc.). */
function nameBlob(mesh: THREE.Mesh, m: THREE.Material): string {
  return `${m.name || ''} ${objectLabel(mesh)}`.toLowerCase()
}

/**
 * `\bdesk\b` misses `Desk_Plane` / `desk_001` because `_` is a “word” char in JS regex boundaries.
 * Use substring tokens common on CAD / Sketchfab exports.
 */
function nameLooksDeskRelated(blob: string): boolean {
  return /desk|table[_\s-]*top|tabletop|countertop|workspace|laminate|pedestal|drawer|office|workbench/i.test(
    blob,
  )
}

function nameLooksTvCabinetRelated(blob: string): boolean {
  return /cabinet|credenza|tv\s*stand|media\s*unit|entertainment|console|stand|base|plinth|drawer|door|knob|shelf|credenza|wood\b/i.test(
    blob,
  )
}

function isVeryThinSlabMesh(mesh: THREE.Mesh): boolean {
  const g = mesh.geometry as THREE.BufferGeometry
  if (!g.boundingBox) g.computeBoundingBox()
  const bb = g.boundingBox
  if (!bb || bb.isEmpty()) return false
  const sx = bb.max.x - bb.min.x
  const sy = bb.max.y - bb.min.y
  const sz = bb.max.z - bb.min.z
  const max = Math.max(sx, sy, sz)
  const min = Math.min(sx, sy, sz)
  if (max < 1e-4) return false
  return min / max < 0.12
}

function uniqueThinSlabScreenMesh(root: THREE.Object3D): THREE.Mesh | null {
  const found: THREE.Mesh[] = []
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    if (!isVeryThinSlabMesh(mesh)) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    if (!mats.some((m) => isUntexturedPbr(m))) return
    found.push(mesh)
  })
  if (found.length === 1) return found[0]!
  return null
}

function isTvScreenMesh(
  mesh: THREE.Mesh,
  m: THREE.Material,
  _gltfUrl: string,
  uniqueSlab: THREE.Mesh | null,
): boolean {
  const blob = nameBlob(mesh, m)
  if (/screen|display|monitor|glass|lcd|led|oled|panel/i.test(blob)) return true
  if (uniqueSlab && mesh === uniqueSlab) return true
  return false
}

function isDeskWoodMesh(
  mesh: THREE.Mesh,
  m: THREE.Material,
  gltfUrl: string,
  uniqueSlab: THREE.Mesh | null,
): boolean {
  if (!isUntexturedPbr(m)) return false
  const blob = nameBlob(mesh, m)
  const { deskLike } = urlHints(gltfUrl)
  if (isTvScreenMesh(mesh, m, gltfUrl, uniqueSlab)) return false
  if (nameLooksDeskRelated(blob)) return true
  /** e.g. `/models/desk1.glb` — entire file is a desk; mesh may be `Cube` / unnamed. */
  if (deskLike) return true
  return false
}

function isTvCabinetWoodMesh(
  mesh: THREE.Mesh,
  m: THREE.Material,
  gltfUrl: string,
  uniqueSlab: THREE.Mesh | null,
): boolean {
  if (!isUntexturedPbr(m)) return false
  const blob = nameBlob(mesh, m)
  const { tvLike } = urlHints(gltfUrl)
  if (isTvScreenMesh(mesh, m, gltfUrl, uniqueSlab)) return false
  if (nameLooksTvCabinetRelated(blob)) return true
  /**
   * TV.glb from CAD is often one mesh `0` + `DefaultMaterial` — no “cabinet” in names.
   * If the URL is clearly a TV asset, upgrade every non-screen PBR shell.
   */
  if (tvLike) return true
  return false
}

function shouldRoundDeskCorners(mesh: THREE.Mesh): boolean {
  const blob = objectLabel(mesh)
  return /desk|countertop|table_top|workspace/i.test(blob)
}

function cloneWoodTextures(base: WoodTextureBundle): WoodTextureBundle {
  const map = base.map.clone()
  const roughnessMap = base.roughnessMap.clone()
  const bumpMap = base.bumpMap.clone()
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping
  const rep = 2.75
  map.repeat.set(rep, rep)
  roughnessMap.repeat.set(rep, rep)
  bumpMap.repeat.set(rep, rep)
  map.colorSpace = THREE.SRGBColorSpace
  roughnessMap.colorSpace = THREE.NoColorSpace
  bumpMap.colorSpace = THREE.NoColorSpace
  return { map, roughnessMap, bumpMap }
}

function makeTvScreenMaterial(m: THREE.Material): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    name: `${m.name || 'TV'} · glass`,
    color: new THREE.Color('#070809'),
    roughness: 0.18,
    metalness: 0.82,
    envMapIntensity: 1.05,
    clearcoat: 1,
    clearcoatRoughness: 0.09,
    emissive: new THREE.Color('#1e2838'),
    emissiveIntensity: 0.22,
    transparent: m.transparent,
    opacity: m.opacity,
    side: m.side,
    depthWrite: m.depthWrite,
    depthTest: m.depthTest,
  })
}

/**
 * Untextured CAD-style desk / TV GLBs read as flat grey game props. Apply hardwood PBR maps (same
 * family as the room floor) + tint for wood bodies; dark glossy emissive panel for TV screens.
 */
export function enhanceBareFurnitureMaterials(
  root: THREE.Object3D,
  gltfUrl: string,
  wood: WoodTextureBundle,
): void {
  const toDispose = new Set<THREE.Material>()
  const sharedWood = cloneWoodTextures(wood)
  const uniqueSlab =
    urlHints(gltfUrl).tvLike ? uniqueThinSlabScreenMesh(root) : null

  root.updateMatrixWorld(true)
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return

    const upgrade = (m: THREE.Material): THREE.Material => {
      if (
        isTvScreenMesh(mesh, m, gltfUrl, uniqueSlab) &&
        (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial)
      ) {
        toDispose.add(m)
        return makeTvScreenMaterial(m)
      }

      const deskWood = isDeskWoodMesh(mesh, m, gltfUrl, uniqueSlab)
      const cabinetWood = isTvCabinetWoodMesh(mesh, m, gltfUrl, uniqueSlab)

      if ((deskWood || cabinetWood) && isUntexturedPbr(m)) {
        toDispose.add(m)
        const prev = m as THREE.MeshStandardMaterial
        const mat = new THREE.MeshStandardMaterial({
          name: `${m.name || 'Wood'} · oak`,
          map: sharedWood.map,
          roughnessMap: sharedWood.roughnessMap,
          bumpMap: sharedWood.bumpMap,
          bumpScale: cabinetWood ? 0.018 : 0.026,
          color: WOOD_TINT.clone(),
          roughness: deskWood ? 0.82 : 0.79,
          metalness: 0.06,
          envMapIntensity: 0.52,
          transparent: m.transparent,
          opacity: m.opacity,
          side: m.side,
          depthWrite: m.depthWrite,
          depthTest: m.depthTest,
        })
        if (prev.vertexColors) {
          mat.vertexColors = false
        }
        if (shouldRoundDeskCorners(mesh)) {
          ;(mat.userData as Record<string, boolean>)[VIVIDHOME_DESK_ENHANCED] = true
        }
        return mat
      }

      return m
    }

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(upgrade)
    } else {
      mesh.material = upgrade(mesh.material)
    }
  })

  toDispose.forEach((x) => x.dispose())
}
