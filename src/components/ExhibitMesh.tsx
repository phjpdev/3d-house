import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { lookDragSync } from '../lib/lookDragSync'
import type { ExhibitConfig } from '../types/house'

type Props = {
  exhibit: ExhibitConfig
  onOpen: (id: string) => void
}

function useImageTexture(url?: string) {
  return useMemo(() => {
    if (!url) return null
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    const tex = loader.load(url)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }, [url])
}

export function ExhibitMesh({ exhibit, onOpen }: Props) {
  const group = useRef<THREE.Group>(null)
  const tex = useImageTexture(exhibit.imageUrl)
  const frameDepth = exhibit.kind === 'wall_frame' ? 0.04 : 0.025
  const w = exhibit.width ?? 0.9
  const h = exhibit.height ?? 0.68
  const frameT = 0.045

  useFrame(() => {
    if (!group.current) return
    group.current.userData.exhibitId = exhibit.id
  })

  const photoMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: tex ? '#ffffff' : '#c9c2b8',
      map: tex,
      roughness: 0.65,
      metalness: 0.05,
      emissive: '#0a0a0a',
      emissiveIntensity: 0.06,
    })
    return m
  }, [tex])

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2a2622',
        roughness: 0.55,
        metalness: 0.1,
      }),
    [],
  )

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (lookDragSync.blockNextExhibitClick) {
      lookDragSync.blockNextExhibitClick = false
      return
    }
    onOpen(exhibit.id)
  }

  return (
    <group
      ref={group}
      position={exhibit.position}
      rotation={[0, exhibit.rotationY ?? 0, 0]}
    >
      <mesh castShadow material={frameMat} position={[0, 0, -frameDepth / 2]}>
        <boxGeometry args={[w + frameT * 2, h + frameT * 2, frameDepth]} />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        material={photoMat}
        position={[0, 0, frameDepth / 2 + 0.002]}
        onClick={handleClick}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  )
}
