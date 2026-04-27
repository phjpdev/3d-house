import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

type Props = {
  url: string
}

/**
 * Loads a room/house shell from `/public/...` (or any reachable URL).
 * Scale/position your model in Blender so Y is up and the floor sits near y = 0.
 */
export function GltfRoom({ url }: Props) {
  const { scene } = useGLTF(url)
  const root = useMemo(() => {
    const g = scene.clone(true)
    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    return g
  }, [scene])

  return <primitive object={root} />
}
