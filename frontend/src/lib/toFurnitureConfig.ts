import type { FurnitureConfig } from '@/types/house'
import type { PlacedFurniture } from '@/store/vividHomeStore'

export function placedToFurniture(p: PlacedFurniture): FurnitureConfig {
  return {
    id: p.id,
    url: p.url,
    position: p.mount === 'ceiling' ? [p.position[0], 0, p.position[2]] : p.position,
    rotationX: p.rotation[0],
    rotationY: p.rotation[1],
    scale: p.scale,
    mount: p.mount,
    lightIntensity: p.lightIntensity,
  }
}
