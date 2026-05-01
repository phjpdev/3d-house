import { isMeshySignedAssetUrl } from '@/lib/meshyAssets'

/** URLs we cannot or should not probe with HTTP (handled elsewhere). */
export function shouldSkipModelReachabilityCheck(url: string): boolean {
  return (
    url.startsWith('blob:') ||
    url.startsWith('data:') ||
    isMeshySignedAssetUrl(url)
  )
}

/**
 * Cheap existence check before GLTFLoader / useGLTF so missing `public/models` files do not crash
 * the whole R3F tree (404 + rejected suspense promise).
 */
export async function checkModelUrlReachable(url: string): Promise<boolean> {
  if (!url) return false
  if (shouldSkipModelReachabilityCheck(url)) return true
  try {
    const r = await fetch(url, { method: 'HEAD', cache: 'no-store' })
    if (r.ok) return true
    if (r.status === 405 || r.status === 501) {
      const r2 = await fetch(url, { headers: { Range: 'bytes=0-0' }, cache: 'no-store' })
      return r2.ok || r2.status === 206
    }
    return false
  } catch {
    return false
  }
}
