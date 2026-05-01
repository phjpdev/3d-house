import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/** Matte charcoal laminate / powder-coat — waterfall desk reference */
const CHARCOAL_DESK = new THREE.Color('#26292e')

function gltfObjectLabel(o: THREE.Object3D): string {
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

function deskStyleHint(m: THREE.Material, mesh: THREE.Mesh): boolean {
  const blob = `${m.name || ''} ${gltfObjectLabel(mesh)}`.toLowerCase()
  return /\bdesk\b|\boffice\s*desk\b|workspace|countertop|laminate/i.test(blob)
}

export function deskEnhancementEligible(m: THREE.Material, mesh: THREE.Mesh): boolean {
  return isUntexturedPbr(m) && deskStyleHint(m, mesh)
}

/** Marks meshes we post-process (rounded corners). */
export const VIVIDHOME_DESK_ENHANCED = 'vividhomeDeskEnhanced' as const

/**
 * Untextured desk GLBs read as blown-out white slabs. Apply a single matte charcoal look so they
 * match modern waterfall-desk references and tag materials for optional rounded geometry.
 */
export function stylizeBareDeskMaterials(root: THREE.Object3D): void {
  let applicable = false
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      if (deskEnhancementEligible(m, mesh)) {
        applicable = true
        return
      }
    }
  })
  if (!applicable) return

  const toDispose = new Set<THREE.Material>()
  root.updateMatrixWorld(true)

  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return

    const upgrade = (m: THREE.Material): THREE.Material => {
      if (!deskEnhancementEligible(m, mesh)) return m

      toDispose.add(m)

      const mat = new THREE.MeshStandardMaterial({
        name: `${m.name || 'Desk'} · matte`,
        color: CHARCOAL_DESK.clone(),
        roughness: 0.91,
        metalness: 0.09,
        envMapIntensity: 0.26,
        transparent: m.transparent,
        opacity: m.opacity,
        side: m.side,
        depthWrite: m.depthWrite,
        depthTest: m.depthTest,
      })
      ;(mat.userData as Record<string, boolean>)[VIVIDHOME_DESK_ENHANCED] = true
      return mat
    }

    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map(upgrade)
    } else {
      mesh.material = upgrade(mesh.material)
    }
  })

  toDispose.forEach((m) => m.dispose())
}

function meshMaterialsTaggedForDesk(mesh: THREE.Mesh): boolean {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  return mats.some((m) => Boolean((m.userData as Record<string, boolean>)?.[VIVIDHOME_DESK_ENHANCED]))
}

/**
 * Replace sharp box meshes with `RoundedBoxGeometry` for subtle edge rolls (same technique as a
 * bevel / fillet on rectangular stock).
 */
export function applyDeskRoundedCorners(root: THREE.Object3D): void {
  root.updateMatrixWorld(true)

  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !meshMaterialsTaggedForDesk(mesh)) return

    const geom = mesh.geometry as THREE.BufferGeometry
    if (!geom?.computeBoundingBox) return

    geom.computeBoundingBox()
    const bb = geom.boundingBox
    if (!bb || bb.isEmpty()) return

    const sx = bb.max.x - bb.min.x
    const sy = bb.max.y - bb.min.y
    const sz = bb.max.z - bb.min.z
    const minE = Math.min(sx, sy, sz)
    if (!Number.isFinite(minE) || minE < 1e-5) return

    let radius = Math.min(minE * 0.052, 0.055)
    radius = Math.max(radius, minE * 0.022)
    const segments = minE > 0.12 ? 4 : 3

    const old = mesh.geometry
    mesh.geometry = new RoundedBoxGeometry(sx, sy, sz, segments, radius)
    old.dispose()
  })
}
