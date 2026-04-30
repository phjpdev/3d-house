const MESHY_ASSETS_HOST = 'assets.meshy.ai'

/** Meshy model downloads are signed HTTPS URLs; the CDN does not send CORS for browsers. */
export function isMeshySignedAssetUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname === MESHY_ASSETS_HOST
  } catch {
    return false
  }
}
