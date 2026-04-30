import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { lookDragSync } from '@/lib/lookDragSync'
import type { ExhibitConfig } from '@/types/house'

type Props = {
  exhibit: ExhibitConfig
  onOpen: (id: string) => void
  /** When false, pointer-out restores `auto` instead of `grab` (matches look-drag disabled). */
  pointerLookEnabled?: boolean
  /** Edit mode: clicking the framed picture selects it for sidebar + transforms. */
  onWallFrameSelect?: () => void
}

function useImageTexture(url: string | undefined, maxAnisotropy: number) {
  return useMemo(() => {
    if (!url) return null
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    const tex = loader.load(url)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = Math.min(maxAnisotropy, 16)
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }, [url, maxAnisotropy])
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
      new THREE.MeshPhysicalMaterial({
        color: '#5c4a3a',
        roughness: 0.56,
        metalness: 0.1,
        clearcoat: 0.35,
        clearcoatRoughness: 0.55,
        envMapIntensity: 0.5,
      }),
    [],
  )
  const standMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#4a3d32',
        roughness: 0.68,
        metalness: 0.06,
        clearcoat: 0.2,
        clearcoatRoughness: 0.65,
        envMapIntensity: 0.45,
      }),
    [],
  )
  const photoMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: tex ? '#ffffff' : '#d4cec4',
      map: tex,
      roughness: 0.58,
      metalness: 0.02,
      envMapIntensity: 0.35,
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
  onWallFrameSelect,
}: Props) {
  const group = useRef<THREE.Group>(null)
  const { gl } = useThree()
  const maxAniso = Math.max(4, gl.capabilities.getMaxAnisotropy?.() ?? 4)
  const tex = useImageTexture(exhibit.imageUrl, maxAniso)
  const canvas = gl.domElement

  const frameDepth = exhibit.kind === 'wall_frame' ? 0.04 : 0.025
  const w = exhibit.width ?? 0.9
  const h = exhibit.height ?? 0.68
  const frameT = 0.045

  const photoMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: tex ? '#ffffff' : '#c9c2b8',
      map: tex,
      roughness: 0.62,
      metalness: 0.04,
      emissive: '#0a0a0a',
      emissiveIntensity: 0.05,
      envMapIntensity: 0.38,
    })
    return m
  }, [tex])

  const frameMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#2a2622',
        roughness: 0.56,
        metalness: 0.09,
        clearcoat: 0.4,
        clearcoatRoughness: 0.52,
        envMapIntensity: 0.55,
      }),
    [],
  )

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

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (lookDragSync.blockNextExhibitClick) {
      lookDragSync.blockNextExhibitClick = false
      return
    }
    if (onWallFrameSelect) {
      onWallFrameSelect()
      e.stopPropagation()
      return
    }
    e.stopPropagation()
    onOpen(exhibit.id)
  }

  const rot = exhibit.rotation ?? [0, exhibit.rotationY ?? 0, 0]
  const sc = exhibit.scale ?? 1

  return (
    <group
      ref={group}
      position={exhibit.position}
      rotation={rot}
      scale={sc}
      onClick={handleClick}
      onPointerOver={() => setHoverCursor(canvas, pointerLookEnabled, true)}
      onPointerOut={() => setHoverCursor(canvas, pointerLookEnabled, false)}
    >
      <mesh receiveShadow material={frameMat} position={[0, 0, -frameDepth / 2]}>
        <boxGeometry args={[w + frameT * 2, h + frameT * 2, frameDepth]} />
      </mesh>
      <mesh
        receiveShadow
        material={photoMat}
        position={[0, 0, frameDepth / 2 + 0.002]}
      >
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  )
}
