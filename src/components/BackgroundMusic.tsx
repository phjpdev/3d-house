import { useEffect, useRef } from 'react'

export function BackgroundMusic({ url }: { url?: string | null }) {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!url) {
      el.pause()
      el.removeAttribute('src')
      el.load()
      return
    }
    el.loop = true
    el.volume = 0.28
    el.src = url
    void el.play().catch(() => {
      /* autoplay policies: user may need to interact */
    })
    return () => {
      el.pause()
      el.removeAttribute('src')
      el.load()
    }
  }, [url])

  return <audio ref={ref} hidden />
}
