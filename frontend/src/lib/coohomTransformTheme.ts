import * as THREE from 'three'
import type { TransformControls as TransformControlsImpl } from 'three-stdlib'

/** Edit gizmo axis stroke; WebGL may still cap at 1px on some GPUs, but helps where supported. */
const GIZMO_AXIS_LINE_WIDTH = 4

/** Coohom-style axis colors (Y-up world): floor X = yellow, up Y = blue, floor Z = green */
const AXIS = {
  X: new THREE.Color('#e8c400'),
  Y: new THREE.Color('#2b7fff'),
  Z: new THREE.Color('#22c55e'),
} as const

function tintObject(o: THREE.Object3D, color: THREE.Color) {
  const any = o as THREE.Mesh & THREE.Line
  const mats: THREE.Material[] = []
  if (any.material) mats.push(...(Array.isArray(any.material) ? any.material : [any.material]))
  for (const m of mats) {
    if ('color' in m && (m as THREE.MeshBasicMaterial).color) {
      ;(m as THREE.MeshBasicMaterial | THREE.LineBasicMaterial).color.copy(color)
    }
  }
}

function axisTint(name: string): THREE.Color | undefined {
  if (name === 'X') return AXIS.X
  if (name === 'Y') return AXIS.Y
  if (name === 'Z') return AXIS.Z
  return undefined
}

/** Hide center uniform-drag handle visuals; picker stays active for clicks */
function hideTranslateXyzVisual(child: THREE.Object3D) {
  const mesh = child as THREE.Mesh
  if (!mesh.material) return
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  for (const m of mats) {
    const mat = m as THREE.MeshBasicMaterial
    if ('opacity' in mat) {
      mat.transparent = true
      mat.opacity = 0
      mat.depthWrite = false
    }
  }
}

function thickenGizmoLineMaterials(gizmo: THREE.Object3D, lineWidth: number) {
  gizmo.traverse((obj) => {
    const line = obj as THREE.Line
    if (!line.isLine) return
    const mats = Array.isArray(line.material) ? line.material : [line.material]
    for (const m of mats) {
      if (m && (m as THREE.LineBasicMaterial).isLineBasicMaterial) {
        const mat = m as THREE.LineBasicMaterial
        mat.linewidth = lineWidth
        mat.needsUpdate = true
      }
    }
  })
}

/** three-stdlib nests handle groups under `tc.gizmo.gizmo` (TransformControlsGizmo shell). */
function resolveGizmoBuckets(tc: TransformControlsImpl): Record<string, THREE.Object3D> | null {
  const raw = tc as unknown as { gizmo?: unknown }
  const shell = raw.gizmo
  if (!shell || typeof shell !== 'object') return null

  const nested = shell as { gizmo?: Record<string, THREE.Object3D> }
  if (nested.gizmo?.translate && Array.isArray(nested.gizmo.translate.children)) {
    return nested.gizmo
  }

  const flat = shell as Record<string, THREE.Object3D>
  if (flat.translate && Array.isArray(flat.translate.children)) {
    return flat
  }

  return null
}

/**
 * Recolor X/Y/Z handles on translate / rotate / scale gizmos to match Coohom reference.
 * Plane handles (XY,YZ,XZ) and view-aligned helpers keep stock colors.
 */
export function applyCoohomTransformTheme(tc: TransformControlsImpl) {
  const buckets = resolveGizmoBuckets(tc)
  if (buckets) {
    for (const mode of ['translate', 'rotate', 'scale'] as const) {
      const g = buckets[mode]
      if (!g || !Array.isArray(g.children)) continue
      for (const child of g.children) {
        const c = axisTint(child.name)
        if (c) tintObject(child, c)
        if (mode === 'translate' && child.name === 'XYZ') hideTranslateXyzVisual(child)
      }
    }
  }

  const shell = (tc as unknown as { gizmo?: THREE.Object3D }).gizmo
  if (shell) thickenGizmoLineMaterials(shell, GIZMO_AXIS_LINE_WIDTH)
}
