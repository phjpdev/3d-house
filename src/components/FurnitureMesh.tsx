import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { FurnitureConfig } from '../types/house'

type Props = {
  item: FurnitureConfig
}

export function FurnitureMesh({ item }: Props) {
  const { scene } = useGLTF(item.url)

  const clone = useMemo(() => {
    const g = scene.clone(true)
    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    return g
  }, [scene, item.url])

  const s = item.scale ?? 1

  return (
    <primitive
      object={clone}
      position={item.position}
      rotation={[0, item.rotationY ?? 0, 0]}
      scale={[s, s, s]}
    />
  )
}
