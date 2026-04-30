/** Max dimension when persisting a raster thumbnail (keeps localStorage reasonable). */
const MAX_THUMB = 256

function readBlobAsDataUrl(blob: Blob): Promise<string | undefined> {
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onloadend = () => resolve(typeof r.result === 'string' ? r.result : undefined)
    r.onerror = () => resolve(undefined)
    r.readAsDataURL(blob)
  })
}

function downscaleDataUrlJpeg(dataUrl: string, quality = 0.82): Promise<string | undefined> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (!w || !h) {
        resolve(dataUrl)
        return
      }
      const scale = Math.min(1, MAX_THUMB / Math.max(w, h))
      const cw = Math.max(1, Math.round(w * scale))
      const ch = Math.max(1, Math.round(h * scale))
      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, cw, ch)
      try {
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(undefined)
    img.src = dataUrl
  })
}

async function maybeDownscaleRasterDataUrl(dataUrl: string): Promise<string | undefined> {
  if (!dataUrl.startsWith('data:image')) return dataUrl
  return (await downscaleDataUrlJpeg(dataUrl)) ?? dataUrl
}

/**
 * Thumbnails saved with Zustand persist must not use `blob:` URLs (they die on refresh).
 * Converts blobs to a JPEG data URL (downscaled). Leaves http(s), `/`, and `data:` as-is.
 */
export async function toPersistableThumbnailUrl(
  url: string | null | undefined,
): Promise<string | undefined> {
  if (!url) return undefined
  if (url.startsWith('data:')) return maybeDownscaleRasterDataUrl(url)
  if (url.startsWith('blob:')) {
    try {
      const res = await fetch(url)
      if (!res.ok) return undefined
      const raw = await readBlobAsDataUrl(await res.blob())
      if (!raw) return undefined
      return maybeDownscaleRasterDataUrl(raw)
    } catch {
      return undefined
    }
  }
  return url
}

/** Prefer reading the source file so we never depend on a live `blob:` fetch. */
export async function fileToPersistableThumbnail(file: File): Promise<string | undefined> {
  const raw = await readBlobAsDataUrl(file)
  if (!raw) return undefined
  return maybeDownscaleRasterDataUrl(raw)
}
