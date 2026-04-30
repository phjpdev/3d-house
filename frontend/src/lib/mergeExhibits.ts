import type { ExhibitConfig } from '@/types/house'
import type { WallPicture } from '@/store/vividHomeStore'

export function mergeWallPictures(
  base: ExhibitConfig[],
  pics: WallPicture[],
): ExhibitConfig[] {
  const extra: ExhibitConfig[] = pics.map((w) => ({
    id: w.id,
    kind: 'wall_frame',
    position: w.position,
    rotationY: w.rotationY,
    rotation: w.rotation,
    width: w.width,
    height: w.height,
    imageUrl: w.imageUrl,
    caption: ' ',
  }))
  return [...base, ...extra]
}
