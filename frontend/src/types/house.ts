export type ExhibitKind = 'wall_frame' | 'desk_photo'

/** Optional placement: `ceiling` = hang under ceiling slab (uses `position.x/z`; `y` ignored). */
export type FurnitureMount = 'floor' | 'ceiling'

/** Optional glTF prop (chair, table, ceiling light, etc.). Path is under site root or an absolute URL. */
export interface FurnitureConfig {
  id: string
  url: string
  position: [number, number, number]
  rotationX?: number
  rotationY?: number
  rotationZ?: number
  /** Uniform scale; models vary in units — tune per asset */
  scale?: number
  mount?: FurnitureMount
  /** When `mount` is `ceiling`: total point-light output split across auto-placed emitters on the bulb mesh (omit to use default). */
  lightIntensity?: number
}

export interface ExhibitConfig {
  id: string
  kind: ExhibitKind
  /** World-space meters, Y up */
  position: [number, number, number]
  rotationY?: number
  /** Full euler when present (overrides rotationY for wall frames) */
  rotation?: [number, number, number]
  /** Uniform scale for framed exhibits */
  scale?: number
  /** Frame / print width in meters */
  width?: number
  height?: number
  /** Public URL or data URL */
  imageUrl?: string
  title?: string
  caption: string
  /** Public URL or data URL for optional narration */
  audioUrl?: string | null
}

export interface HouseConfig {
  id: string
  name: string
  tagline?: string
  /** When set, loads `/public/...` glTF room instead of the built-in procedural room */
  roomGltfUrl?: string | null
  /**
   * When using the procedural shell: extra glTF pieces (CC0 models from `/models/...` or URLs).
   * For a full scanned room via `roomGltfUrl`, leave empty unless you want add-on props.
   */
  furniture?: FurnitureConfig[]
  /** Procedural shell only: rounded wood desk near the east wall (default true) */
  builtInDesk?: boolean
  spawn: {
    position: [number, number, number]
    rotationY: number
  }
  backgroundMusicUrl?: string | null
  exhibits: ExhibitConfig[]
}
