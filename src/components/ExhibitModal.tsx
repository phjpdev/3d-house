import { useEffect, useState } from 'react'
import type { ExhibitConfig } from '../types/house'

type Props = {
  exhibit: ExhibitConfig
  onClose: () => void
}

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const done = () => resolve()
    img.onload = done
    img.onerror = done
    img.src = url
  })
}

export function ExhibitModal({ exhibit, onClose }: Props) {
  const [ready, setReady] = useState(!exhibit.imageUrl)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    if (!exhibit.imageUrl) {
      setReady(true)
      return () => {
        cancelled = true
      }
    }
    setReady(false)
    preloadImage(exhibit.imageUrl).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [exhibit.id, exhibit.imageUrl])

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className={`modal-card${ready ? ' modal-card--ready' : ''}`}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {!ready ? (
          <div className="modal-loading" aria-busy="true">
            <span className="modal-loading-dot" />
            <span className="modal-loading-dot" />
            <span className="modal-loading-dot" />
          </div>
        ) : (
          <div className="modal-content">
            {exhibit.imageUrl ? (
              <div className="modal-visual">
                <img className="modal-image" src={exhibit.imageUrl} alt="" />
              </div>
            ) : null}
            <div className="modal-body">
              {exhibit.title ? <h2 className="modal-title">{exhibit.title}</h2> : null}
              <p className="modal-caption">{exhibit.caption}</p>
              {exhibit.audioUrl ? (
                <div className="modal-audio">
                  <audio controls src={exhibit.audioUrl} preload="metadata" />
                </div>
              ) : (
                <p className="modal-muted">No voice note for this piece.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
