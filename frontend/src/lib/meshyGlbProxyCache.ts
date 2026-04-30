import { isMeshySignedAssetUrl } from '@/lib/meshyAssets'

/** Resolved blob: URLs — kept for the session so remounts don’t re-hit Meshy /api */
const resolvedBlobUrlBySource = new Map<string, string>()
/** Single in-flight fetch per Meshy URL */
const inflightBySource = new Map<string, Promise<string>>()

export function getCachedMeshyBlobUrl(sourceUrl: string): string | null {
  return resolvedBlobUrlBySource.get(sourceUrl) ?? null
}

/**
 * One download per Meshy asset URL for the whole app lifetime (until reload).
 * Meshy blocks direct browser fetch (no CORS); all loads go through `/api/meshy-glb`.
 */
export function loadMeshyGlbViaProxy(sourceUrl: string): Promise<string> {
  if (!isMeshySignedAssetUrl(sourceUrl)) {
    return Promise.reject(new Error('Not a Meshy asset URL'))
  }

  const hit = resolvedBlobUrlBySource.get(sourceUrl)
  if (hit) return Promise.resolve(hit)

  let pending = inflightBySource.get(sourceUrl)
  if (pending) return pending

  pending = (async () => {
    const res = await fetch('/api/meshy-glb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUrl }),
    })
    if (!res.ok) {
      const errBody = await res.text()
      let msg = `HTTP ${res.status}`
      try {
        const j = JSON.parse(errBody) as { error?: string }
        if (typeof j.error === 'string') msg = j.error
      } catch {
        /* ignore */
      }
      throw new Error(msg)
    }
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    resolvedBlobUrlBySource.set(sourceUrl, objectUrl)
    return objectUrl
  })()

  inflightBySource.set(sourceUrl, pending)
  pending.finally(() => inflightBySource.delete(sourceUrl))

  return pending
}
