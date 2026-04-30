'use client'

import { useEffect, useState } from 'react'

type Props = {
  thumbnailUrl?: string | null
  /** Letter fallback */
  name: string
  className?: string
}

/**
 * Library thumbnails must never be stale `blob:` URLs (persisted blobs break after reload).
 * Invalid / failed URLs fall back to an initial letter so the row always reads clearly.
 */
export function LibraryThumbnail({ thumbnailUrl, name, className }: Props) {
  const [failed, setFailed] = useState(false)
  const url =
    thumbnailUrl && !thumbnailUrl.startsWith('blob:') ? thumbnailUrl : undefined

  useEffect(() => {
    setFailed(false)
  }, [url])

  const initial = (name.trim().slice(0, 1) || '?').toUpperCase()

  if (!url || failed) {
    return (
      <div
        className={[
          'flex items-center justify-center bg-stone-200/70 text-lg font-medium text-stone-500',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden
      >
        {initial}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
