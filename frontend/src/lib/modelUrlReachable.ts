import { isMeshySignedAssetUrl } from '@/lib/meshyAssets'

/** URLs we cannot or should not probe with HTTP (handled elsewhere). */
export function shouldSkipModelReachabilityCheck(url: string): boolean {
  return (
    url.startsWith('blob:') ||
    url.startsWith('data:') ||
    isMeshySignedAssetUrl(url)
  )
}

/** Same-origin `/models/*.glb|gltf` — use `/api/models/exists` so missing files never trigger browser 404 logs. */
function shouldProbePublicModelsViaApi(url: string): boolean {
  try {
    const pathOnly = url.split('?')[0].split('#')[0]
    if (pathOnly.startsWith('/models/')) {
      return /\.(glb|gltf)$/i.test(pathOnly)
    }
    if (typeof window !== 'undefined' && /^https?:\/\//i.test(url)) {
      const u = new URL(url)
      if (u.origin !== window.location.origin) return false
      return u.pathname.startsWith('/models/') && /\.(glb|gltf)$/i.test(u.pathname)
    }
  } catch {
    return false
  }
  return false
}

/**
 * Cheap existence check before GLTFLoader / useGLTF so missing `public/models` files do not crash
 * the whole R3F tree (404 + rejected suspense promise).
 */
export async function checkModelUrlReachable(url: string): Promise<boolean> {
  if (!url) return false
  if (shouldSkipModelReachabilityCheck(url)) return true

  if (shouldProbePublicModelsViaApi(url)) {
    try {
      const probe = `/api/models/exists?url=${encodeURIComponent(url)}`
      const r = await fetch(probe, { cache: 'no-store' })
      if (!r.ok) return false
      const j = (await r.json()) as { reachable?: boolean }
      return Boolean(j.reachable)
    } catch {
      return false
    }
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      cache: 'no-store',
    })
    return res.ok || res.status === 206
  } catch {
    return false
  }
}
