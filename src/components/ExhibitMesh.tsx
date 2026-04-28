import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { lookDragSync } from '../lib/lookDragSync'
import type { ExhibitConfig } from '../types/house'

type Props = {
  exhibit: ExhibitConfig
  onOpen: (id: string) => void
  /** When false, pointer-out restores `auto` instead of `grab` (matches look-drag disabled). */
  pointerLookEnabled?: boolean
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

function setHoverCursor(
  canvas: HTMLCanvasElement,
  pointerLookEnabled: boolean,
  active: boolean,
) {
  if (lookDragSync.lookDragging) return
  canvas.style.cursor = active ? 'pointer' : pointerLookEnabled ? 'grab' : 'auto'
}

/** Small desk / easel piece: thin frame + photo + light stand (no bulky black slab). */
function DeskPhotoExhibit({
  exhibit,
  onOpen,
  tex,
  canvas,
  pointerLookEnabled,
}: {
  exhibit: ExhibitConfig
  onOpen: (id: string) => void
  tex: THREE.Texture | null
  canvas: HTMLCanvasElement
  pointerLookEnabled: boolean
}) {
  const root = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!root.current) return
    root.current.userData.exhibitId = exhibit.id
  })

  const pw = exhibit.width ?? 0.28
  const ph = exhibit.height ?? 0.35
  const frameT = 0.018
  const backZ = -0.012

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5c4a3a',
        roughness: 0.55,
        metalness: 0.12,
      }),
    [],
  )
  const standMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#4a3d32',
        roughness: 0.7,
        metalness: 0.05,
      }),
    [],
  )
  const photoMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: tex ? '#ffffff' : '#d4cec4',
      map: tex,
      roughness: 0.55,
      metalness: 0.02,
    })
  }, [tex])

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (lookDragSync.blockNextExhibitClick) {
      lookDragSync.blockNextExhibitClick = false
      return
    }
    onOpen(exhibit.id)
  }

  const fw = pw + frameT * 2
  const fh = ph + frameT * 2

  return (
    <group ref={root} position={exhibit.position} rotation={[0, exhibit.rotationY ?? 0, 0]}>
      {/* Thin backing only */}
      <mesh position={[0, 0, backZ]} receiveShadow material={frameMat}>
        <boxGeometry args={[fw, fh, 0.008]} />
      </mesh>
      {/* Photo */}
      <mesh
        position={[0, 0, backZ + 0.005]}
        receiveShadow
        material={photoMat}
        onClick={handleClick}
        onPointerOver={() => setHoverCursor(canvas, pointerLookEnabled, true)}
        onPointerOut={() => setHoverCursor(canvas, pointerLookEnabled, false)}
      >
        <planeGeometry args={[pw, ph]} />
      </mesh>
      {/* Thin frame edges */}
      <mesh position={[0, (ph + frameT) / 2, backZ + 0.004]} receiveShadow material={frameMat}>
        <boxGeometry args={[fw, frameT, 0.012]} />
      </mesh>
      <mesh position={[0, -(ph + frameT) / 2, backZ + 0.004]} receiveShadow material={frameMat}>
        <boxGeometry args={[fw, frameT, 0.012]} />
      </mesh>
      <mesh position={[(pw + frameT) / 2, 0, backZ + 0.004]} receiveShadow material={frameMat}>
        <boxGeometry args={[frameT, fh, 0.012]} />
      </mesh>
      <mesh position={[-(pw + frameT) / 2, 0, backZ + 0.004]} receiveShadow material={frameMat}>
        <boxGeometry args={[frameT, fh, 0.012]} />
      </mesh>
      {/* Fold-out easel legs */}
      <mesh
        position={[-pw * 0.22, -ph * 0.42, -0.06]}
        rotation={[0.52, 0, 0.12]}
        receiveShadow
        material={standMat}
      >
        <boxGeometry args={[0.022, 0.2, 0.022]} />
      </mesh>
      <mesh
        position={[pw * 0.22, -ph * 0.42, -0.06]}
        rotation={[0.52, 0, -0.12]}
        receiveShadow
        material={standMat}
      >
        <boxGeometry args={[0.022, 0.2, 0.022]} />
      </mesh>
      <mesh position={[0, -ph * 0.48, -0.04]} receiveShadow material={standMat}>
        <boxGeometry args={[pw * 0.5, 0.02, 0.04]} />
      </mesh>
    </group>
  )
}

export function ExhibitMesh({
  exhibit,
  onOpen,
  pointerLookEnabled = true,
}: Props) {
  const group = useRef<THREE.Group>(null)
  const { gl } = useThree()
  const tex = useImageTexture(exhibit.imageUrl)
  const canvas = gl.domElement

  useFrame(() => {
    if (!group.current) return
    group.current.userData.exhibitId = exhibit.id
  })

  if (exhibit.kind === 'desk_photo') {
    return (
      <DeskPhotoExhibit
        exhibit={exhibit}
        onOpen={onOpen}
        tex={tex}
        canvas={canvas}
        pointerLookEnabled={pointerLookEnabled}
      />
    )
  }

  const frameDepth = exhibit.kind === 'wall_frame' ? 0.04 : 0.025
  const w = exhibit.width ?? 0.9
  const h = exhibit.height ?? 0.68
  const frameT = 0.045

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
      <mesh receiveShadow material={frameMat} position={[0, 0, -frameDepth / 2]}>
        <boxGeometry args={[w + frameT * 2, h + frameT * 2, frameDepth]} />
      </mesh>
      <mesh
        receiveShadow
        material={photoMat}
        position={[0, 0, frameDepth / 2 + 0.002]}
        onClick={handleClick}
        onPointerOver={() => setHoverCursor(canvas, pointerLookEnabled, true)}
        onPointerOut={() => setHoverCursor(canvas, pointerLookEnabled, false)}
      >
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  )
}
