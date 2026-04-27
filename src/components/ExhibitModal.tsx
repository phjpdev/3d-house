import { useEffect } from 'react'
import type { ExhibitConfig } from '../types/house'

type Props = {
  exhibit: ExhibitConfig
  onClose: () => void
}

export function ExhibitModal({ exhibit, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {exhibit.imageUrl ? (
          <img className="modal-image" src={exhibit.imageUrl} alt="" />
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
    </div>
  )
}
