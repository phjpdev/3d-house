import { useLayoutEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { HouseConfig } from '../types/house'
import type { InteriorShellMaterials } from '../types/interiorMaterials'
import { Corridors } from './Corridors'
import { FurnitureMesh } from './FurnitureMesh'
import { interiorTexturePaths } from './interiorTextureUrls'
import { InteriorLights } from './InteriorLights'
import { ProceduralRoom } from './ProceduralRoom'

function useInteriorShellMaterials(): InteriorShellMaterials {
  const t = useTexture({
    floorMap: interiorTexturePaths.floorDiffuse,
    floorRough: interiorTexturePaths.floorRoughness,
    floorBump: interiorTexturePaths.floorBump,
    wallNor: interiorTexturePaths.wallNormal,
  })

  useLayoutEffect(() => {
    const rep = 3.2
    t.floorMap.wrapS = t.floorMap.wrapT = THREE.RepeatWrapping
    t.floorRough.wrapS = t.floorRough.wrapT = THREE.RepeatWrapping
    t.floorBump.wrapS = t.floorBump.wrapT = THREE.RepeatWrapping
    t.floorMap.repeat.set(rep, rep)
    t.floorRough.repeat.set(rep, rep)
    t.floorBump.repeat.set(rep, rep)
    t.floorMap.colorSpace = THREE.SRGBColorSpace
    t.floorRough.colorSpace = THREE.NoColorSpace
    t.floorBump.colorSpace = THREE.NoColorSpace

    t.wallNor.wrapS = t.wallNor.wrapT = THREE.RepeatWrapping
    t.wallNor.repeat.set(9, 9)
    t.wallNor.colorSpace = THREE.NoColorSpace
  }, [t])

  const materials = useMemo(() => {
    const floor = new THREE.MeshStandardMaterial({
      map: t.floorMap,
      roughnessMap: t.floorRough,
      bumpMap: t.floorBump,
      bumpScale: 0.032,
      roughness: 1,
      metalness: 0.04,
      envMapIntensity: 0.48,
    })
    const wall = new THREE.MeshStandardMaterial({
      color: '#eae4dc',
      normalMap: t.wallNor,
      normalScale: new THREE.Vector2(0.15, 0.15),
      roughness: 0.91,
      metalness: 0,
      envMapIntensity: 0.3,
    })
    const ceiling = new THREE.MeshStandardMaterial({
      color: '#ebe7df',
      roughness: 0.86,
      metalness: 0,
      envMapIntensity: 0.22,
    })
    const trim = new THREE.MeshStandardMaterial({
      color: '#5c4f42',
      roughness: 0.72,
      metalness: 0.06,
      envMapIntensity: 0.35,
    })
    const desk = new THREE.MeshStandardMaterial({
      color: '#4d3f33',
      roughness: 0.76,
      metalness: 0.07,
      envMapIntensity: 0.42,
    })
    return { floor, wall, ceiling, trim, desk }
  }, [t])

  return materials
}

type Props = {
  house: HouseConfig
}

/**
 * Procedural house shell with PBR floor/walls (runtime textures) + optional glTF furniture.
 * For a full scanned interior, set `roomGltfUrl` on the house instead.
 */
export function InteriorShell({ house }: Props) {
  const materials = useInteriorShellMaterials()

  return (
    <>
      <ProceduralRoom materials={materials} showBuiltInDesk={house.builtInDesk !== false} />
      <Corridors materials={materials} />
      <InteriorLights />
      {house.furniture?.map((item) => (
        <FurnitureMesh key={`${item.id}:${item.url}`} item={item} />
      ))}
    </>
  )
}
