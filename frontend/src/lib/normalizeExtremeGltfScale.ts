import * as THREE from 'three'

/**
 * CAD / OBJ → glTF exports often bake huge root scales. The camera stays near origin while the mesh
 * spans hundreds of meters — viewers sit inside the solid and see nothing (back-face culling).
 */
const OVERSIZED_MODEL_MAX_DIM_M = 4
const NORMALIZED_MODEL_MAX_DIM_M = 1.85

export function normalizeExtremeModelScale(root: THREE.Object3D): void {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  if (box.isEmpty()) return
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  if (!Number.isFinite(maxDim) || maxDim <= OVERSIZED_MODEL_MAX_DIM_M) return
  const factor = NORMALIZED_MODEL_MAX_DIM_M / maxDim
  root.scale.multiplyScalar(factor)
  root.updateMatrixWorld(true)
}
