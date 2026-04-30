import { ROOM } from '@/lib/houseLayout'

/**
 * North wall picture window (must match `ProceduralRoom` north opening + glass).
 * Used for drapes and plants that sit in front of the glass.
 */
export const NORTH_WINDOW = {
  width: 2.85,
  height: 1.52,
  sillY: 0.86,
  get topY() {
    return this.sillY + this.height
  },
  /** World Z of the inner glass plane (facing the garden). */
  glassZ: -ROOM.half + 0.045,
} as const
