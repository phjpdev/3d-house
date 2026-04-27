import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { HouseConfig } from '../types/house'
import { fetchHouseConfig } from '../lib/houseConfig'
import { BackgroundMusic } from './BackgroundMusic'
import { ExhibitModal } from './ExhibitModal'
import { HouseCanvas } from './HouseCanvas'
import { OwnerPanel } from './OwnerPanel'

export function HouseExperience() {
  const { slug } = useParams()
  const [house, setHouse] = useState<HouseConfig | null>(null)
  const [activeExhibitId, setActiveExhibitId] = useState<string | null>(null)
  const [ownerOpen, setOwnerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchHouseConfig(slug ?? 'demo').then((h) => {
      if (!cancelled) setHouse(h)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  const activeExhibit = house?.exhibits.find((e) => e.id === activeExhibitId)

  const lookEnabled = !ownerOpen && !activeExhibitId

  if (!house) {
    return (
      <div className="boot-screen">
        <p>Loading room…</p>
      </div>
    )
  }

  return (
    <div className="experience">
      <HouseCanvas
        house={house}
        onOpenExhibit={setActiveExhibitId}
        pointerLookEnabled={lookEnabled}
      />

      <div className="hud">
        <div className="hud-top">
          <div>
            <h1 className="hud-title">{house.name}</h1>
            {house.tagline ? <p className="hud-tagline">{house.tagline}</p> : null}
          </div>
          <button type="button" className="hud-btn" onClick={() => setOwnerOpen(true)}>
            Owner
          </button>
        </div>
        <div className="hud-bottom">
          <p>
            <strong>Drag</strong> on the room to look around. Walk with <kbd>W</kbd> <kbd>A</kbd>{' '}
            <kbd>S</kbd> <kbd>D</kbd> or arrows — explore the south corridor and the east wing. Tap a
            framed photo (without dragging) to read its story.
          </p>
        </div>
      </div>

      <BackgroundMusic url={house.backgroundMusicUrl} />

      {activeExhibit ? (
        <ExhibitModal exhibit={activeExhibit} onClose={() => setActiveExhibitId(null)} />
      ) : null}

      {ownerOpen ? (
        <OwnerPanel house={house} onChange={setHouse} onClose={() => setOwnerOpen(false)} />
      ) : null}
    </div>
  )
}
