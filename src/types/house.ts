export type ExhibitKind = 'wall_frame' | 'desk_photo'

export interface ExhibitConfig {
  id: string
  kind: ExhibitKind
  /** World-space meters, Y up */
  position: [number, number, number]
  rotationY?: number
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
  spawn: {
    position: [number, number, number]
    rotationY: number
  }
  backgroundMusicUrl?: string | null
  exhibits: ExhibitConfig[]
}
