import { useEffect, useMemo, useState } from 'react'
import { isMeshySignedAssetUrl } from '@/lib/meshyAssets'

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
 */
export function useMeshyGlbBlobUrl(sourceUrl: string | null | undefined): Result {
  const needsProxy = useMemo(
    () => Boolean(sourceUrl && isMeshySignedAssetUrl(sourceUrl)),
    [sourceUrl],
  )

  const [loadUrl, setLoadUrl] = useState<string | null>(() => {
    if (!sourceUrl) return null
    return needsProxy ? null : sourceUrl
  })
  const [loading, setLoading] = useState(() => Boolean(sourceUrl && needsProxy))
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

    let cancelled = false
    const blobRef: { current: string | null } = { current: null }

    setLoadUrl(null)
    setLoading(true)
    setFetchError(null)

    ;(async () => {
      try {
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
        blobRef.current = objectUrl
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          blobRef.current = null
          return
        }
        setLoadUrl(objectUrl)
      } catch (e) {
        if (!cancelled) {
          setLoadUrl(null)
          setFetchError(e instanceof Error ? e.message : 'Failed to load model')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current)
        blobRef.current = null
      }
    }
  }, [sourceUrl, needsProxy])

  return { loadUrl, loading, error: fetchError }
}
