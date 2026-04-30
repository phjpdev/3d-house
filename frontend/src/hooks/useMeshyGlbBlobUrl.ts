import { useEffect, useMemo, useState } from 'react'
import { isMeshySignedAssetUrl } from '@/lib/meshyAssets'
import { getCachedMeshyBlobUrl, loadMeshyGlbViaProxy } from '@/lib/meshyGlbProxyCache'

type Result = {
  /** URL safe to pass to `useGLTF` (same-origin blob or original). */
  loadUrl: string | null
  /** True while fetching Meshy GLB through the app proxy. */
  loading: boolean
  /** Set when the proxy fetch fails (Meshy URLs only). */
  error: string | null
}

/**
 * Meshy `assets.meshy.ai` GLBs block browser `fetch` (no CORS). This hook pulls the file via
 * `/api/meshy-glb` and exposes a `blob:` URL for loaders.
 *
 * Downloads are **deduped and cached** per Meshy URL so route changes / remounts don’t refetch.
 */
export function useMeshyGlbBlobUrl(sourceUrl: string | null | undefined): Result {
  const needsProxy = useMemo(
    () => Boolean(sourceUrl && isMeshySignedAssetUrl(sourceUrl)),
    [sourceUrl],
  )

  const [loadUrl, setLoadUrl] = useState<string | null>(() => {
    if (!sourceUrl) return null
    if (!needsProxy) return sourceUrl
    return getCachedMeshyBlobUrl(sourceUrl)
  })
  const [loading, setLoading] = useState(() =>
    Boolean(sourceUrl && needsProxy && !getCachedMeshyBlobUrl(sourceUrl)),
  )
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!sourceUrl) {
      setLoadUrl(null)
      setLoading(false)
      setFetchError(null)
      return
    }

    if (!needsProxy) {
      setLoadUrl(sourceUrl)
      setLoading(false)
      setFetchError(null)
      return
    }

    const cached = getCachedMeshyBlobUrl(sourceUrl)
    if (cached) {
      setLoadUrl(cached)
      setLoading(false)
      setFetchError(null)
      return
    }

    let cancelled = false
    setLoadUrl(null)
    setLoading(true)
    setFetchError(null)

    loadMeshyGlbViaProxy(sourceUrl)
      .then((url) => {
        if (!cancelled) setLoadUrl(url)
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadUrl(null)
          setFetchError(e instanceof Error ? e.message : 'Failed to load model')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sourceUrl, needsProxy])

  return { loadUrl, loading, error: fetchError }
}
