import type { HouseConfig } from '../types/house'

const defaultConfig: HouseConfig = {
  id: 'fallback',
  name: 'Empty house',
  tagline: 'Could not load house JSON.',
  roomGltfUrl: null,
  furniture: [],
  builtInDesk: true,
  spawn: { position: [0, 0, 0], rotationY: 0 },
  backgroundMusicUrl: null,
  exhibits: [],
}

export async function fetchHouseConfig(slug: string): Promise<HouseConfig> {
  const path = `/houses/${slug}.json`
  try {
    const res = await fetch(path)
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as HouseConfig
    return normalizeHouse(data)
  } catch {
    return defaultConfig
  }
}

export function normalizeHouse(input: HouseConfig): HouseConfig {
  return {
    ...input,
    furniture: input.furniture ?? [],
    builtInDesk: input.builtInDesk ?? true,
    exhibits: (input.exhibits ?? []).map((e) => ({
      rotationY: 0,
      width: e.kind === 'wall_frame' ? 0.9 : 0.3,
      height: e.kind === 'wall_frame' ? 0.68 : 0.38,
      audioUrl: e.audioUrl ?? null,
      ...e,
    })),
  }
}

export function parseHouseJsonText(text: string): HouseConfig {
  const raw = JSON.parse(text) as HouseConfig
  return normalizeHouse(raw)
}
